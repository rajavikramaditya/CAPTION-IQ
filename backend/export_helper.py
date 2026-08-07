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


import re

TEMPLATE_PRESETS = {
    "minimal": {"font": "Inter", "weight": 600, "color": "#ffffff", "box": False, "box_color": "rgba(0,0,0,0.6)", "stroke_width": 0, "stroke_color": "#000000", "uppercase": False, "position": "bottom"},
    "modern": {"font": "Poppins", "weight": 700, "color": "#ffffff", "box": True, "box_color": "rgba(17,24,39,0.72)", "stroke_width": 0, "stroke_color": "#000000", "uppercase": False, "position": "bottom"},
    "news": {"font": "Oswald", "weight": 600, "color": "#ffffff", "box": True, "box_color": "#DC2626", "stroke_width": 0, "stroke_color": "#000000", "uppercase": True, "position": "bottom"},
    "finance": {"font": "Archivo", "weight": 700, "color": "#ffffff", "box": True, "box_color": "rgba(2,6,23,0.84)", "stroke_width": 0, "stroke_color": "#000000", "uppercase": False, "position": "bottom"},
    "cinematic": {"font": "Outfit", "weight": 400, "color": "#ffffff", "box": False, "box_color": "rgba(0,0,0,0.6)", "stroke_width": 0, "stroke_color": "#000000", "uppercase": True, "position": "bottom"},
    "shorts": {"font": "Anton", "weight": 400, "color": "#ffffff", "box": False, "box_color": "rgba(0,0,0,0.6)", "stroke_width": 6, "stroke_color": "#000000", "uppercase": True, "position": "center"},
    "gaming": {"font": "Russo One", "weight": 400, "color": "#ffffff", "box": False, "box_color": "rgba(0,0,0,0.6)", "stroke_width": 4, "stroke_color": "#0B1020", "uppercase": True, "position": "center"},
    "bold-impact": {"font": "Montserrat", "weight": 800, "color": "#ffffff", "box": False, "box_color": "rgba(0,0,0,0.6)", "stroke_width": 5, "stroke_color": "#000000", "uppercase": True, "position": "center"},
    "mrbeast": {"font": "Anton", "weight": 400, "color": "#ffffff", "box": True, "box_color": "rgba(0,0,0,0.85)", "stroke_width": 8, "stroke_color": "#000000", "uppercase": True, "position": "bottom"},
    "hormozi": {"font": "Montserrat", "weight": 900, "color": "#ffffff", "box": True, "box_color": "#000000", "stroke_width": 0, "stroke_color": "#000000", "uppercase": True, "position": "bottom"},
    "luxury": {"font": "Cormorant Garamond", "weight": 300, "color": "#D4AF37", "box": False, "box_color": "rgba(0,0,0,0.6)", "stroke_width": 0, "stroke_color": "#000000", "uppercase": True, "position": "bottom"},
}


def _ass_color(hex_str: str) -> str:
    if not hex_str:
        return "&H00FFFFFF"
    hex_str = hex_str.strip()
    
    # Handle rgba(r,g,b,a)
    if hex_str.startswith("rgba"):
        parts = re.findall(r"[\d.]+", hex_str)
        if len(parts) >= 3:
            r = int(parts[0])
            g = int(parts[1])
            b = int(parts[2])
            a = float(parts[3]) if len(parts) > 3 else 1.0
            aa = int((1.0 - a) * 255)
            return f"&H{aa:02X}{b:02X}{g:02X}{r:02X}"
            
    # Handle rgb(r,g,b)
    if hex_str.startswith("rgb"):
        parts = re.findall(r"\d+", hex_str)
        if len(parts) >= 3:
            r = int(parts[0])
            g = int(parts[1])
            b = int(parts[2])
            return f"&H00{b:02X}{g:02X}{r:02X}"

    # Handle standard #RRGGBB
    clean = hex_str.lstrip("#")
    if len(clean) == 8:
        r, g, b, a = clean[0:2], clean[2:4], clean[4:6], clean[6:8]
        return f"&H{a}{b}{g}{r}"
    elif len(clean) == 6:
        r, g, b = clean[0:2], clean[2:4], clean[4:6]
        return f"&H00{b}{g}{r}"
    elif len(clean) == 3:
        r, g, b = clean[0]*2, clean[1]*2, clean[2]*2
        return f"&H00{b}{g}{r}"
    return "&H00FFFFFF"


def to_txt(doc: CaptionDocument) -> str:
    """Return a plain text transcript (no timestamps)."""
    if not doc.words:
        return ""
    return " ".join(w.text for w in doc.words)


def to_ass(doc: CaptionDocument) -> str:
    """
    Convert CaptionDocument to ASS (Advanced SubStation Alpha) format.
    Produces a dynamically styled ASS file suitable for ffmpeg -vf subtitles
    and matches the selected creator template.
    """
    segs = _segments(doc)
    
    # Resolve styling presets & overrides
    style_info = doc.style or {}
    template_id = getattr(style_info, "template_id", "modern") or "modern"
    overrides = getattr(style_info, "overrides", {}) or {}
    
    # Get base preset or fallback to modern
    preset = TEMPLATE_PRESETS.get(template_id, TEMPLATE_PRESETS["modern"])
    
    # Apply settings overrides
    font = overrides.get("font", preset["font"])
    weight = overrides.get("weight", preset["weight"])
    color = overrides.get("color", preset["color"])
    box_enabled = overrides.get("boxOverride", preset["box"])
    box_color = overrides.get("box_color", preset["box_color"])
    stroke_width = overrides.get("stroke_width", preset["stroke_width"])
    stroke_color = overrides.get("stroke_color", preset["stroke_color"])
    uppercase = overrides.get("uppercase", preset["uppercase"])
    position = overrides.get("position", preset["position"])
    
    # Convert parameters to ASS format values
    ass_primary = _ass_color(color)
    ass_stroke_color = _ass_color(stroke_color)
    ass_box_color = _ass_color(box_color)
    
    bold_val = -1 if weight >= 600 else 0
    border_style = 3 if box_enabled else 1
    outline_val = stroke_width if stroke_width else 0
    
    align_val = 2 # default bottom-center
    if position == "top":
        align_val = 6
    elif position == "center":
        align_val = 10

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
        f"Style: Default,{font},56,{ass_primary},&H000000FF,{ass_stroke_color},"
        f"{ass_box_color},{bold_val},0,0,0,100,100,0,0,{border_style},{outline_val},1,{align_val},60,60,40,1\n\n"
        "[Events]\n"
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
    )
    events = []
    for seg in segs:
        def ass_ts(sec: float) -> str:
            h, m, s, ms = _ms(sec)
            cs = ms // 10  # centiseconds
            return f"{h}:{m:02d}:{s:02d}.{cs:02d}"
        text = seg["text"].upper() if uppercase else seg["text"]
        text = text.replace("\n", "\\N").strip()
        events.append(
            f"Dialogue: 0,{ass_ts(seg['start'])},{ass_ts(seg['end'])},"
            f"Default,,0,0,0,,{text}"
        )
    return header + "\n".join(events) + "\n"

