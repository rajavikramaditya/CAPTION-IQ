"""
FFmpeg Subtitle Burn-In Video Renderer (M-RENDER).

Runs ffmpeg as an asynchronous subprocess to bake ASS subtitles directly into
the video track. Utilizes standard libass subtitles filter.
"""
import asyncio
import logging
import os
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)


async def render_burned_video(
    video_bytes: bytes,
    ass_content: str,
    original_filename: str,
    alpha: bool = False,
    codec: str = "libx264",
) -> bytes:
    """
    Burn ASS subtitles into video bytes using FFmpeg.
    If alpha=True, generates a transparent-background video track.
    codec can be 'libx264' (H.264 default) or 'libx265' (H.265 / HEVC compact).
    """
    ext = Path(original_filename or "clip.mp4").suffix.lower() or ".mp4"
    if ext not in (".mp4", ".mov", ".m4v", ".webm", ".mkv"):
        ext = ".mp4"

    out_ext = ".mov" if alpha else ".mp4"

    # Create temporary files
    in_video_fd, in_video_path = tempfile.mkstemp(suffix=ext)
    ass_fd, ass_path = tempfile.mkstemp(suffix=".ass")
    out_video_path = in_video_path + f".output{out_ext}"

    try:
        # Write inputs
        with os.fdopen(in_video_fd, "wb") as f:
            f.write(video_bytes)
        with os.fdopen(ass_fd, "w", encoding="utf-8") as f:
            f.write(ass_content)

        safe_ass_path = ass_path.replace("\\", "/")

        if alpha:
            # Transparent background output for NLE plugins (ProRes 4444 or PNG codec)
            cmd = [
                "ffmpeg", "-y",
                "-i", in_video_path,
                "-vf", f"subtitles='{safe_ass_path}',colorkey=0x000000:0.01:0.0",
                "-c:v", "png",
                out_video_path
            ]
        else:
            vcodec = "libx265" if codec == "h265" else "libx264"
            cmd = [
                "ffmpeg", "-y",
                "-i", in_video_path,
                "-vf", f"subtitles='{safe_ass_path}'",
                "-c:v", vcodec,
                "-preset", "fast",
                "-crf", "22",
                "-c:a", "copy",
                out_video_path
            ]

        logger.info(f"Starting ffmpeg subtitle render: {' '.join(cmd)}")

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await proc.communicate()

        if proc.returncode != 0:
            err_msg = stderr.decode("utf-8", errors="ignore")
            logger.error(f"FFmpeg render failed with code {proc.returncode}. Stderr:\n{err_msg}")
            raise RuntimeError(f"FFmpeg rendering failed: {err_msg}")

        logger.info("FFmpeg subtitle render complete")

        # Read completed file
        with open(out_video_path, "rb") as f:
            result = f.read()

        return result

    finally:
        # Clean up all temp files
        for p in (in_video_path, ass_path, out_video_path):
            try:
                if p and os.path.exists(p):
                    os.remove(p)
            except Exception as e:
                logger.warning(f"Failed to remove temp file {p}: {e}")
