"""Projects + media ingestion (M-CORE + M-INGEST)."""
import re
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Request, Response, HTTPException, Depends, UploadFile, File, Form, Query, BackgroundTasks

from database import db
from storage import put_object, get_object, APP_NAME
from auth import get_current_user
from models import (
    CreateProjectRequest, UpdateCaptionRequest, CaptionDocument, gen_id,
)
from transcription import transcribe_bytes
from export_helper import to_srt, to_vtt, to_txt, to_ass
from audio_enhance import denoise_audio
from content_generator import generate_content
from renderer import render_burned_video

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/projects")

MAX_UPLOAD_MB = 25
ALLOWED_EXT = {"mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm", "mov"}


def now_dt():
    return datetime.now(timezone.utc).isoformat()


async def _owned_project(project_id: str, user: dict) -> dict:
    project = await db.projects.find_one({"project_id": project_id, "user_id": user["user_id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _summary(p: dict) -> dict:
    doc = p.get("caption_document") or {}
    return {
        "project_id": p["project_id"], "title": p["title"], "status": p["status"],
        "has_media": bool(p.get("media_id")),
        "word_count": doc.get("word_count", 0), "duration": doc.get("duration", 0.0),
        "created_at": p["created_at"], "updated_at": p["updated_at"],
    }


@router.post("")
async def create_project(body: CreateProjectRequest, user: dict = Depends(get_current_user)):
    ts = now_dt()
    project = {
        "project_id": gen_id("proj"), "user_id": user["user_id"],
        "title": (body.title or "Untitled Project").strip()[:120],
        "status": "draft", "media_id": None,
        "caption_document": CaptionDocument().model_dump(),
        "created_at": ts, "updated_at": ts,
    }
    await db.projects.insert_one(dict(project))
    project.pop("_id", None)
    return project


@router.get("")
async def list_projects(user: dict = Depends(get_current_user)):
    cursor = db.projects.find({"user_id": user["user_id"]}, {"_id": 0}).sort("updated_at", -1)
    projects = await cursor.to_list(1000)
    return [_summary(p) for p in projects]


@router.get("/{project_id}")
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    return await _owned_project(project_id, user)


@router.delete("/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    project = await _owned_project(project_id, user)
    await db.media_assets.update_many({"project_id": project_id}, {"$set": {"is_deleted": True}})
    await db.projects.delete_one({"project_id": project_id})
    return {"success": True}


@router.patch("/{project_id}/title")
async def rename_project(project_id: str, body: dict, user: dict = Depends(get_current_user)):
    """Rename a project title inline from the dashboard."""
    title = (body.get("title") or "").strip()[:120]
    if not title:
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    await _owned_project(project_id, user)
    await db.projects.update_one(
        {"project_id": project_id},
        {"$set": {"title": title, "updated_at": now_dt()}}
    )
    return {"success": True, "title": title}


@router.post("/{project_id}/media")
async def upload_media(project_id: str, file: UploadFile = File(...),
                       duration: float = Form(0.0), user: dict = Depends(get_current_user)):
    project = await _owned_project(project_id, user)
    ext = (file.filename or "clip.mp4").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail=f"Unsupported format .{ext}")

    data = await file.read()
    if len(data) > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File exceeds {MAX_UPLOAD_MB}MB limit.")

    media_id = gen_id("media")
    path = f"{APP_NAME}/uploads/{user['user_id']}/{media_id}.{ext}"
    content_type = file.content_type or "application/octet-stream"
    try:
        result = put_object(path, data, content_type)
    except Exception as e:
        logger.error(f"Storage upload failed: {e}")
        raise HTTPException(status_code=502, detail="Upload to storage failed")

    await db.media_assets.insert_one({
        "media_id": media_id, "project_id": project_id, "user_id": user["user_id"],
        "storage_path": result["path"], "original_filename": file.filename,
        "content_type": content_type, "size": result.get("size", len(data)),
        "duration": float(duration or 0.0), "is_deleted": False, "created_at": now_dt(),
    })
    await db.projects.update_one(
        {"project_id": project_id},
        {"$set": {"media_id": media_id, "updated_at": now_dt(),
                  "title": project["title"] if project["title"] != "Untitled Project"
                  else (file.filename or project["title"])[:120]}},
    )
    return {"media_id": media_id, "duration": float(duration or 0.0), "size": result.get("size", len(data))}


@router.get("/{project_id}/media")
async def stream_media(project_id: str, request: Request, user: dict = Depends(get_current_user)):
    project = await _owned_project(project_id, user)
    if not project.get("media_id"):
        raise HTTPException(status_code=404, detail="No media for this project")
    media = await db.media_assets.find_one(
        {"media_id": project["media_id"], "is_deleted": False}, {"_id": 0})
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    data, ctype = get_object(media["storage_path"])
    ctype = media.get("content_type") or ctype
    size = len(data)

    range_header = request.headers.get("range")
    if range_header:
        m = re.match(r"bytes=(\d+)-(\d*)", range_header)
        if m:
            start = int(m.group(1))
            end = int(m.group(2)) if m.group(2) else size - 1
            end = min(end, size - 1)
            chunk = data[start:end + 1]
            return Response(chunk, status_code=206, media_type=ctype, headers={
                "Content-Range": f"bytes {start}-{end}/{size}",
                "Accept-Ranges": "bytes", "Content-Length": str(len(chunk)),
            })
    return Response(data, media_type=ctype,
                    headers={"Accept-Ranges": "bytes", "Content-Length": str(size)})


@router.post("/{project_id}/transcribe")
async def transcribe_project(
    project_id: str,
    denoise: bool = Query(False, description="Run audio denoising before transcription"),
    language: str = Query("hinglish", description="Language slug: hinglish | hindi | english | urdu | tamil ..."),
    custom_prompt: Optional[str] = Query(None, description="Custom brand terms / vocabulary prompting"),
    user: dict = Depends(get_current_user),
):
    project = await _owned_project(project_id, user)
    if not project.get("media_id"):
        raise HTTPException(status_code=400, detail="Upload a video before transcribing")
    media = await db.media_assets.find_one(
        {"media_id": project["media_id"], "is_deleted": False}, {"_id": 0})
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    job_id = gen_id("job")
    await db.jobs.insert_one({
        "job_id": job_id, "user_id": user["user_id"], "project_id": project_id,
        "type": "transcription", "status": "processing", "progress": 0,
        "error": None, "created_at": now_dt(), "updated_at": now_dt(),
    })

    status_label = "denoising" if denoise else "transcribing"
    await db.projects.update_one({"project_id": project_id},
                                 {"$set": {"status": status_label, "updated_at": now_dt()}})

    try:
        data, _ = get_object(media["storage_path"])

        # Optional audio enhancement step
        if denoise:
            logger.info(f"Running audio denoise for project {project_id}")
            data = await denoise_audio(data, media.get("original_filename") or "clip.mp4")
            await db.projects.update_one({"project_id": project_id},
                                         {"$set": {"status": "transcribing", "updated_at": now_dt()}})

        doc = await transcribe_bytes(data, media.get("original_filename") or "clip.mp4", language=language, custom_prompt=custom_prompt)
    except ValueError as e:
        await _fail_job(job_id, project_id, str(e))
        raise HTTPException(status_code=413, detail=str(e))
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        await _fail_job(job_id, project_id, str(e))
        raise HTTPException(status_code=502, detail="Transcription failed")

    await db.projects.update_one(
        {"project_id": project_id},
        {"$set": {"caption_document": doc.model_dump(), "status": "ready", "updated_at": now_dt()}})
    await db.jobs.update_one({"job_id": job_id},
                             {"$set": {"status": "done", "progress": 100, "updated_at": now_dt()}})
    await db.usage_events.insert_one({
        "event_id": gen_id("usage"), "user_id": user["user_id"], "project_id": project_id,
        "type": "transcription", "quantity": doc.duration, "unit": "seconds", "created_at": now_dt(),
    })
    return doc.model_dump()


@router.put("/{project_id}/caption")
async def update_caption(project_id: str, body: UpdateCaptionRequest,
                         user: dict = Depends(get_current_user)):
    await _owned_project(project_id, user)
    doc = body.caption_document
    doc.word_count = len(doc.words)
    doc.source = doc.source or "manual"
    await db.projects.update_one(
        {"project_id": project_id},
        {"$set": {"caption_document": doc.model_dump(), "status": "ready", "updated_at": now_dt()}})
    return {"success": True}


@router.get("/{project_id}/export")
async def export_caption(
    project_id: str,
    format: str = Query("srt", description="Output format: srt | vtt | txt | ass"),
    user: dict = Depends(get_current_user),
):
    """Download the project captions as a subtitle file (SRT, VTT, TXT, or ASS)."""
    project = await _owned_project(project_id, user)
    raw_doc = project.get("caption_document")
    if not raw_doc or not raw_doc.get("words"):
        raise HTTPException(status_code=404, detail="No captions found for this project")

    doc = CaptionDocument(**raw_doc)
    fmt = format.lower().strip()

    if fmt == "srt":
        content = to_srt(doc)
        media_type = "application/x-subrip"
        ext = "srt"
    elif fmt == "vtt":
        content = to_vtt(doc)
        media_type = "text/vtt"
        ext = "vtt"
    elif fmt == "txt":
        content = to_txt(doc)
        media_type = "text/plain"
        ext = "txt"
    elif fmt == "ass":
        content = to_ass(doc)
        media_type = "text/plain"
        ext = "ass"
    elif fmt == "json":
        from export_helper import to_json
        content = to_json(doc)
        media_type = "application/json"
        ext = "json"
    elif fmt == "csv":
        from export_helper import to_csv
        content = to_csv(doc)
        media_type = "text/csv"
        ext = "csv"
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format '{fmt}'. Use srt, vtt, txt, ass, json, or csv.")

    safe_title = re.sub(r'[^\w\s-]', '', project.get('title', 'captions')).strip().replace(' ', '_')
    filename = f"{safe_title}.{ext}"

    return Response(
        content=content.encode("utf-8"),
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(content.encode("utf-8"))),
        },
    )


async def _fail_job(job_id: str, project_id: str, error: str):
    await db.jobs.update_one({"job_id": job_id},
                             {"$set": {"status": "failed", "error": error, "updated_at": now_dt()}})
    await db.projects.update_one({"project_id": project_id},
                                 {"$set": {"status": "failed", "updated_at": now_dt()}})


@router.post("/{project_id}/content")
async def generate_ai_content(
    project_id: str,
    user: dict = Depends(get_current_user),
):
    """
    Generate AI social media content (summary, hook, YouTube title, Instagram/LinkedIn
    captions, hashtags, SEO keywords, CTA) from the project transcript.
    Result is stored in the project document and returned.
    """
    project = await _owned_project(project_id, user)
    raw_doc = project.get("caption_document")
    if not raw_doc or not raw_doc.get("words"):
        raise HTTPException(status_code=404, detail="No transcript found. Generate captions first.")

    # Build full transcript text from word list
    words = raw_doc.get("words", [])
    transcript = " ".join(w.get("text", "") for w in words if w.get("text"))
    language = raw_doc.get("language") or "en"

    try:
        content = await generate_content(transcript, language)
    except Exception as e:
        logger.error(f"Content generation failed for project {project_id}: {e}")
        raise HTTPException(status_code=502, detail="AI content generation failed. Please try again.")

    # Persist content to project document
    await db.projects.update_one(
        {"project_id": project_id},
        {"$set": {"ai_content": content, "updated_at": now_dt()}},
    )
    return content


async def _run_render_job(project_id: str, job_id: str, user_id: str, media_path: str, filename: str, doc_dump: dict, alpha: bool = False, codec: str = "h264"):
    """Asynchronous background worker task that generates ASS subtitles, bakes them via ffmpeg, and uploads the MP4/MOV."""
    try:
        # Load video data from object storage
        video_data, ctype = get_object(media_path)
        
        # Build CaptionDocument model to execute templates style resolution
        doc = CaptionDocument(**doc_dump)
        ass_str = to_ass(doc)

        # Run render
        rendered_bytes = await render_burned_video(video_data, ass_str, filename, alpha=alpha, codec=codec)

        # Upload completed MP4/MOV to storage renders path
        ext = "mov" if alpha else "mp4"
        mime = "video/quicktime" if alpha else "video/mp4"
        out_path = f"{APP_NAME}/renders/{user_id}/{job_id}.{ext}"
        put_result = put_object(out_path, rendered_bytes, mime)

        # Update Job in database
        download_url = f"/api/projects/{project_id}/render/download/{job_id}"
        await db.jobs.update_one(
            {"job_id": job_id},
            {"$set": {
                "status": "done",
                "progress": 100,
                "result_path": put_result["path"],
                "download_url": download_url,
                "updated_at": now_dt()
            }}
        )
    except Exception as e:
        logger.error(f"Render job {job_id} failed: {e}")
        await db.jobs.update_one(
            {"job_id": job_id},
            {"$set": {
                "status": "failed",
                "error": str(e),
                "updated_at": now_dt()
            }}
        )


@router.post("/{project_id}/render")
async def render_project(
    project_id: str,
    background_tasks: BackgroundTasks,
    alpha: bool = Query(False, description="Export alpha-channel transparent video for NLE plugins"),
    codec: str = Query("h264", description="Video codec: h264 | h265"),
    user: dict = Depends(get_current_user),
):
    """Trigger background video rendering with captions burned in."""
    project = await _owned_project(project_id, user)
    if not project.get("media_id"):
        raise HTTPException(status_code=400, detail="No video media found. Upload media first.")

    raw_doc = project.get("caption_document")
    if not raw_doc or not raw_doc.get("words"):
        raise HTTPException(status_code=400, detail="No captions found. Generate captions first.")

    media = await db.media_assets.find_one(
        {"media_id": project["media_id"], "is_deleted": False}, {"_id": 0})
    if not media:
        raise HTTPException(status_code=404, detail="Media asset not found")

    job_id = gen_id("job")
    await db.jobs.insert_one({
        "job_id": job_id, "user_id": user["user_id"], "project_id": project_id,
        "type": "render", "status": "processing", "progress": 10,
        "error": None, "created_at": now_dt(), "updated_at": now_dt(),
    })

    background_tasks.add_task(
        _run_render_job,
        project_id=project_id,
        job_id=job_id,
        user_id=user["user_id"],
        media_path=media["storage_path"],
        filename=media.get("original_filename") or "video.mp4",
        doc_dump=raw_doc,
        alpha=alpha,
        codec=codec,
    )

    return {"job_id": job_id, "status": "processing"}


@router.get("/{project_id}/render/status/{job_id}")
async def get_render_status(
    project_id: str,
    job_id: str,
    user: dict = Depends(get_current_user),
):
    """Query progress and download link for active rendering jobs."""
    await _owned_project(project_id, user)
    job = await db.jobs.find_one({"job_id": job_id, "project_id": project_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Render job not found")
    return job


@router.get("/{project_id}/render/download/{job_id}")
async def download_rendered_video(
    project_id: str,
    job_id: str,
    user: dict = Depends(get_current_user),
):
    """Stream or download the completed burned-in MP4 video file."""
    project = await _owned_project(project_id, user)
    job = await db.jobs.find_one({"job_id": job_id, "project_id": project_id})
    if not job or job.get("status") != "done":
        raise HTTPException(status_code=404, detail="Rendered video not found or not ready yet")

    storage_path = job.get("result_path")
    try:
        data, ctype = get_object(storage_path)
    except Exception as e:
        logger.error(f"Failed to fetch render result from storage: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch file from storage")

    safe_title = re.sub(r'[^\w\s-]', '', project.get('title', 'captioned_video')).strip().replace(' ', '_')
    filename = f"{safe_title}_captioned.mp4"

    return Response(
        content=data,
        media_type="video/mp4",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(data)),
        },
    )


@router.post("/{project_id}/translate")
async def translate_project(
    project_id: str,
    target_lang: str = Query("english", description="Target language: english | hindi | hinglish | spanish ..."),
    user: dict = Depends(get_current_user),
):
    """Translate project captions into target language while preserving word timestamps."""
    from translator import translate_caption_doc

    project = await _owned_project(project_id, user)
    raw_doc = project.get("caption_document")
    if not raw_doc or not raw_doc.get("words"):
        raise HTTPException(status_code=400, detail="No captions found to translate")

    doc = CaptionDocument(**raw_doc)
    translated_doc = await translate_caption_doc(doc, target_lang)

    return translated_doc.model_dump()


@router.post("/{project_id}/script")
async def switch_script(
    project_id: str,
    target_script: str = Query("devanagari", description="Target script: devanagari | roman"),
    user: dict = Depends(get_current_user),
):
    """Switch caption script mode between Roman Hindi and Devanagari Hindi using LLM transliteration."""
    project = await _owned_project(project_id, user)
    raw_doc = project.get("caption_document")
    if not raw_doc or not raw_doc.get("words"):
        raise HTTPException(status_code=400, detail="No captions found")

    doc = CaptionDocument(**raw_doc)
    target = "Devanagari Hindi script (e.g. मैं कल आऊंगा)" if target_script == "devanagari" else "Roman Hindi script (e.g. Main kal aaunga)"
    
    from translator import translate_caption_doc
    new_doc = await translate_caption_doc(doc, target)

    await db.projects.update_one(
        {"project_id": project_id},
        {"$set": {"caption_document": new_doc.model_dump(), "updated_at": now_dt()}}
    )

    return new_doc.model_dump()


@router.post("/{project_id}/privacy")
async def toggle_privacy(
    project_id: str,
    auto_delete_24h: bool = Query(True, description="Enable 24h media auto-delete privacy mode"),
    user: dict = Depends(get_current_user),
):
    """Toggle 24-hour auto-delete privacy mode for sensitive media."""
    project = await _owned_project(project_id, user)
    delete_at = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat() if auto_delete_24h else None

    await db.projects.update_one(
        {"project_id": project_id},
        {"$set": {"auto_delete_24h": auto_delete_24h, "auto_delete_at": delete_at, "updated_at": now_dt()}}
    )

    return {"project_id": project_id, "auto_delete_24h": auto_delete_24h, "auto_delete_at": delete_at}


@router.post("/{project_id}/clone")
async def clone_project(
    project_id: str,
    user: dict = Depends(get_current_user),
):
    """Duplicate an existing project, its media reference, and captions."""
    orig = await _owned_project(project_id, user)
    new_id = gen_id("proj")
    new_title = f"{orig.get('title', 'Project')} (Copy)"
    
    cloned = {
        **orig,
        "project_id": new_id,
        "title": new_title,
        "created_at": now_dt(),
        "updated_at": now_dt(),
    }
    cloned.pop("_id", None)

    await db.projects.insert_one(cloned)
    return {"project_id": new_id, "title": new_title}
