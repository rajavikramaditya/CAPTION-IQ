"""Projects + media ingestion (M-CORE + M-INGEST)."""
import re
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Request, Response, HTTPException, Depends, UploadFile, File, Form, Query

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

        doc = await transcribe_bytes(data, media.get("original_filename") or "clip.mp4")
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
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format '{fmt}'. Use srt, vtt, txt, or ass.")

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
