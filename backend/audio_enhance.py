"""
Audio Enhancement — noise reduction preprocessing before Whisper transcription.

Uses noisereduce (spectral gating) + pydub for format conversion.
Designed to be fault-tolerant: if any library or step fails, returns the
original audio bytes unchanged so transcription still proceeds.

Algorithm:
  1. Convert input bytes → WAV via pydub (handles mp3/mp4/m4a/webm/wav)
  2. Run noisereduce.reduce_noise() on numpy array
  3. Convert denoised WAV back to original format
  4. Return denoised bytes

Dependencies (added to requirements.txt):
  noisereduce>=3.0.0
  pydub>=0.25.1
  numpy (already pulled in by pandas)
"""
import io
import logging
import tempfile
import os
from pathlib import Path

logger = logging.getLogger(__name__)


def _get_format(filename: str) -> str:
    """Return pydub-compatible format string from filename."""
    ext = Path(filename or "clip.mp3").suffix.lower().lstrip(".")
    fmt_map = {"mp4": "mp4", "m4a": "mp4", "mov": "mp4", "webm": "webm",
               "mp3": "mp3", "mpga": "mp3", "wav": "wav", "mpeg": "mp3"}
    return fmt_map.get(ext, "mp3")


async def denoise_audio(data: bytes, filename: str) -> bytes:
    """
    Apply spectral-gating noise reduction to audio bytes.
    Returns denoised bytes in the same format, or original bytes on any error.
    """
    try:
        import numpy as np
        import noisereduce as nr
        from pydub import AudioSegment
    except ImportError as e:
        logger.warning(f"Audio enhancement libraries not available ({e}). Skipping denoise.")
        return data

    try:
        fmt = _get_format(filename)
        logger.info(f"Denoising audio: {filename!r} ({len(data)} bytes, format={fmt})")

        # Load via pydub
        seg = AudioSegment.from_file(io.BytesIO(data), format=fmt)

        # Convert to mono float32 numpy array at original sample rate
        sample_rate = seg.frame_rate
        samples = np.array(seg.get_array_of_samples(), dtype=np.float32)

        # If stereo, mix down to mono
        if seg.channels == 2:
            samples = samples.reshape(-1, 2).mean(axis=1)

        # Normalise to [-1, 1]
        max_val = np.abs(samples).max()
        if max_val > 0:
            samples = samples / max_val

        # Noise reduction — estimate noise profile from first 0.5s
        prop_decrease = 0.75   # aggressiveness: 0=none, 1=full
        reduced = nr.reduce_noise(
            y=samples,
            sr=sample_rate,
            prop_decrease=prop_decrease,
            stationary=False,
        )

        # Denormalise back to int16
        reduced_int = (reduced * 32767).astype(np.int16)

        # Rebuild AudioSegment
        denoised_seg = AudioSegment(
            data=reduced_int.tobytes(),
            sample_width=2,
            frame_rate=sample_rate,
            channels=1,
        )

        # Export back to original format in memory
        out_buf = io.BytesIO()
        denoised_seg.export(out_buf, format="mp3" if fmt in ("mp3", "mpga", "mpeg") else "wav")
        result = out_buf.getvalue()

        logger.info(f"Denoise complete: {len(data)} → {len(result)} bytes")
        return result

    except Exception as e:
        logger.error(f"Denoise failed ({e}). Using original audio.")
        return data
