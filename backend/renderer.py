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
) -> bytes:
    """
    Burn ASS subtitles into the video bytes using FFmpeg.
    Returns the completed video bytes.
    """
    ext = Path(original_filename or "clip.mp4").suffix.lower() or ".mp4"
    if ext not in (".mp4", ".mov", ".m4v", ".webm", ".mkv"):
        ext = ".mp4"

    # Create temporary files
    in_video_fd, in_video_path = tempfile.mkstemp(suffix=ext)
    ass_fd, ass_path = tempfile.mkstemp(suffix=".ass")
    out_video_path = in_video_path + ".output.mp4"

    try:
        # Write inputs
        with os.fdopen(in_video_fd, "wb") as f:
            f.write(video_bytes)
        with os.fdopen(ass_fd, "w", encoding="utf-8") as f:
            f.write(ass_content)

        # Build FFmpeg command.
        # Use relative paths and quotes to avoid Windows path escaping issues with ffmpeg filter paths.
        # On Windows, we must escape the backslashes or use forward slashes in filter paths.
        safe_ass_path = ass_path.replace("\\", "/")
        cmd = [
            "ffmpeg", "-y",
            "-i", in_video_path,
            "-vf", f"subtitles='{safe_ass_path}'",
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
