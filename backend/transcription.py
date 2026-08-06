"""Whisper transcription + LLM semantic entity tagging.
Produces a CaptionDocument (frozen schema)."""
import os
import re
import json
import logging
import tempfile
from pathlib import Path

from emergentintegrations.llm.openai import OpenAISpeechToText
from emergentintegrations.llm.chat import LlmChat, UserMessage

from models import CaptionDocument, CaptionWord, CaptionSegment

logger = logging.getLogger(__name__)
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

TAG_SYSTEM = (
    "You are a linguistic entity tagger for Hinglish (Roman Hindi) and English video captions. "
    "Given a transcript, identify words that are Person names, Locations (cities, places, countries), "
    "and Action verbs (words describing an action, e.g. shoot, gaya, banai, editing, khaya). "
    "Return STRICT JSON only, no markdown, in the shape: "
    '{"persons": ["..."], "locations": ["..."], "actions": ["..."]}. '
    "Use the exact word tokens as they appear (without surrounding punctuation). "
    "Be precise: only clear person names, clear places, and clear action verbs."
)


def _normalize(w: str) -> str:
    return re.sub(r"[^a-z0-9]", "", w.lower())


async def _tag_entities(transcript: str) -> dict:
    if not transcript.strip():
        return {"persons": [], "locations": [], "actions": []}
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id="captioniq-tagger",
                   system_message=TAG_SYSTEM).with_model("openai", "gpt-5.4")
    try:
        raw = await chat.send_message(UserMessage(text=f"Transcript:\n{transcript}\n\nReturn the JSON now."))
    except Exception as e:
        logger.error(f"Entity tagging failed: {e}")
        return {"persons": [], "locations": [], "actions": []}
    m = re.search(r"\{.*\}", raw.strip(), re.DOTALL)
    if not m:
        return {"persons": [], "locations": [], "actions": []}
    try:
        data = json.loads(m.group(0))
    except Exception:
        return {"persons": [], "locations": [], "actions": []}
    return {
        "persons": {_normalize(x) for x in data.get("persons", []) if isinstance(x, str)},
        "locations": {_normalize(x) for x in data.get("locations", []) if isinstance(x, str)},
        "actions": {_normalize(x) for x in data.get("actions", []) if isinstance(x, str)},
    }


def _classify(word: str, tags: dict):
    n = _normalize(word)
    if not n:
        return None
    if n in tags["persons"]:
        return "person"
    if n in tags["locations"]:
        return "location"
    if n in tags["actions"]:
        return "action"
    return None


def _gv(obj, key, default=None):
    return obj.get(key, default) if isinstance(obj, dict) else getattr(obj, key, default)


async def transcribe_bytes(data: bytes, filename: str) -> CaptionDocument:
    if len(data) > 25 * 1024 * 1024:
        raise ValueError("File exceeds 25MB transcription limit.")

    suffix = Path(filename or "clip.mp4").suffix or ".mp4"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(data)
            tmp_path = tmp.name
        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        with open(tmp_path, "rb") as audio_file:
            resp = await stt.transcribe(
                file=audio_file, model="whisper-1", response_format="verbose_json",
                prompt="Hinglish (Roman Hindi) video caption. Keep names and places in Roman script.",
                temperature=0.0, timestamp_granularities=["segment", "word"],
            )
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)

    full_text = getattr(resp, "text", "") or ""
    raw_words = getattr(resp, "words", None) or []
    raw_segments = getattr(resp, "segments", None) or []
    language = getattr(resp, "language", None)
    tags = await _tag_entities(full_text)

    words = []
    for i, w in enumerate(raw_words):
        text = _gv(w, "word", "") or _gv(w, "text", "")
        words.append(CaptionWord(
            id=f"w_{i}", text=text,
            start=float(_gv(w, "start", 0.0) or 0.0),
            end=float(_gv(w, "end", 0.0) or 0.0),
            entity_type=_classify(text, tags),
        ))

    segments = []
    for si, s in enumerate(raw_segments):
        s_start = float(_gv(s, "start", 0.0) or 0.0)
        s_end = float(_gv(s, "end", 0.0) or 0.0)
        wid = [w.id for w in words if s_start - 0.05 <= w.start < s_end + 0.05]
        segments.append(CaptionSegment(id=f"s_{si}", start=s_start, end=s_end,
                                        word_ids=wid, text=(_gv(s, "text", "") or "").strip()))

    # Fallback: synthesize words from segments if word timestamps missing.
    if not words and segments:
        idx = 0
        for seg in segments:
            toks = seg.text.split()
            if not toks:
                continue
            step = max(seg.end - seg.start, 0.01) / len(toks)
            ids = []
            for j, tk in enumerate(toks):
                st = seg.start + j * step
                wid = f"w_{idx}"
                words.append(CaptionWord(id=wid, text=tk, start=st, end=st + step,
                                         entity_type=_classify(tk, tags)))
                ids.append(wid)
                idx += 1
            seg.word_ids = ids

    duration = max((w.end for w in words), default=0.0)
    return CaptionDocument(
        version=1, language=language, source="whisper",
        words=words, segments=segments,
        word_count=len(words), duration=duration,
    )
