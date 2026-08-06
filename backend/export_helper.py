"""
Export helpers: convert a CaptionDocument into standard subtitle formats.
No external dependencies — pure Python string generation.

Supported formats:
  SRT  — SubRip (.srt)  — universal, works in VLC, YouTube, DaVinci, Premiere
  VTT  — WebVTT (.vtt)  — web standard, works in HTML5 <track>
  TXT  — Plain text (.txt) — raw transcript without timestamps
  ASS  — Advanced SubStation Alpha (.ass) — used by DaVinci Resolve, ffmpeg burn-in
"""
from models import CaptionDocument


def _ms(seconds: float) -> tuple[int, int, int, int]:
    """Return (hours, minutes, secs, milliseconds) from a float seconds value."""
    total_ms = int(round(seconds * 1000))
    ms = total_ms % 1000
    total_s = total_ms // 1000
    s = total_s % 60
    total_m = total_s // 60
    m = total_m % 60
    h = total_m // 60
    return h, m, s, ms


def _srt_ts(seconds: float) -> str:
    h, m, s, ms = _ms(seconds)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _vtt_ts(seconds: float) -> str:
    h, m, s, ms = _ms(seconds)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


def _segments(doc: CaptionDocument) -> list[dict]:
    """
    Return a list of {start, end, text} dicts — one per subtitle block.
    Uses doc.segments if available, otherwise treats the whole transcript as one block.
    """
    if not doc.words:
        return []

    word_by_id = {w.id: w for w in doc.words}

    if doc.segments:
        result = []
        for seg in doc.segments:
            if not seg.word_ids:
                continue
            seg_words = [word_by_id[wid] for wid in seg.word_ids if wid in word_by_id]
            if not seg_words:
                continue
            text = seg.text.strip() or " ".join(w.text for w in seg_words)
            result.append({
                "start": seg_words[0].start,
                "end": seg_words[-1].end,
                "text": text,
            })
        return result

    # Fallback: one block from full word list
    return [{
        "start": doc.words[0].start,
        "end": doc.words[-1].end,
        "text": " ".join(w.text for w in doc.words),
    }]


def to_srt(doc: CaptionDocument) -> str:
    """Convert CaptionDocument to SRT format string."""
    segs = _segments(doc)
    if not segs:
        return ""
    lines = []
    for i, seg in enumerate(segs, 1):
        lines.append(str(i))
        lines.append(f"{_srt_ts(seg['start'])} --> {_srt_ts(seg['end'])}")
        lines.append(seg["text"])
        lines.append("")
    return "\n".join(lines)


def to_vtt(doc: CaptionDocument) -> str:
    """Convert CaptionDocument to WebVTT format string."""
    segs = _segments(doc)
    if not segs:
        return "WEBVTT\n"
    lines = ["WEBVTT", ""]
    for i, seg in enumerate(segs, 1):
        lines.append(f"{i}")
        lines.append(f"{_vtt_ts(seg['start'])} --> {_vtt_ts(seg['end'])}")
        lines.append(seg["text"])
        lines.append("")
    return "\n".join(lines)


def to_txt(doc: CaptionDocument) -> str:
    """Return a plain text transcript (no timestamps)."""
    if not doc.words:
        return ""
    return " ".join(w.text for w in doc.words)


def to_ass(doc: CaptionDocument) -> str:
    """
    Convert CaptionDocument to ASS (Advanced SubStation Alpha) format.
    Produces a minimal but valid ASS file suitable for ffmpeg -vf subtitles
    and DaVinci Resolve import.
    The style uses a clean white bold font — matching CaptionIQ's default
    caption look without depending on the frontend template engine.
    """
    segs = _segments(doc)
    header = (
        "[Script Info]\n"
        "ScriptType: v4.00+\n"
        "PlayResX: 1920\n"
        "PlayResY: 1080\n"
        "ScaledBorderAndShadow: yes\n\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, "
        "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, "
        "ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding\n"
        # White text, black outline, bottom-centre (Alignment=2)
        "Style: Default,Poppins,52,&H00FFFFFF,&H000000FF,&H00000000,"
        "&H80000000,-1,0,0,0,100,100,0,0,1,3,1,2,60,60,40,1\n\n"
        "[Events]\n"
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
    )
    events = []
    for seg in segs:
        def ass_ts(sec: float) -> str:
            h, m, s, ms = _ms(sec)
            cs = ms // 10  # centiseconds
            return f"{h}:{m:02d}:{s:02d}.{cs:02d}"
        text = seg["text"].replace("\n", "\\N")
        events.append(
            f"Dialogue: 0,{ass_ts(seg['start'])},{ass_ts(seg['end'])},"
            f"Default,,0,0,0,,{text}"
        )
    return header + "\n".join(events) + "\n"
