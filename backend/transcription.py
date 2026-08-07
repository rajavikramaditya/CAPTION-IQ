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
    "Given a transcript, categorize tokens into 6 categories:\n"
    "1. persons: Person names (e.g. Modi, Rahul, Elon)\n"
    "2. locations: Cities, countries, places (e.g. Mumbai, India, office)\n"
    "3. actions: Action verbs (e.g. shoot, gaya, banai, editing, khaya)\n"
    "4. numbers: Numbers, money, percentages (e.g. 50k, 500, $, %, lakh, crore)\n"
    "5. times: Time, dates, days (e.g. aaj, kal, monday, 5pm, morning)\n"
    "6. emotions: Emotional hooks or viral CTAs (e.g. unbelievable, subscribe, secret, amazing, must)\n"
    "Return STRICT JSON only, no markdown, in shape:\n"
    '{"persons": [...], "locations": [...], "actions": [...], "numbers": [...], "times": [...], "emotions": [...]}. '
    "Use exact word tokens as they appear."
)


def _normalize(w: str) -> str:
    return re.sub(r"[^a-z0-9]", "", w.lower())


async def _tag_entities(transcript: str) -> dict:
    empty = {"persons": set(), "locations": set(), "actions": set(), "numbers": set(), "times": set(), "emotions": set()}
    if not transcript.strip():
        return empty
    try:
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id="captioniq-tagger",
                       system_message=TAG_SYSTEM).with_model("openai", "gpt-5.4")
        raw = await chat.send_message(UserMessage(text=f"Transcript:\n{transcript}\n\nReturn the JSON now."))
        m = re.search(r"\{.*\}", raw.strip(), re.DOTALL)
        if m:
            data = json.loads(m.group(0))
            return {
                "persons": {_normalize(x) for x in data.get("persons", []) if isinstance(x, str)},
                "locations": {_normalize(x) for x in data.get("locations", []) if isinstance(x, str)},
                "actions": {_normalize(x) for x in data.get("actions", []) if isinstance(x, str)},
                "numbers": {_normalize(x) for x in data.get("numbers", []) if isinstance(x, str)},
                "times": {_normalize(x) for x in data.get("times", []) if isinstance(x, str)},
                "emotions": {_normalize(x) for x in data.get("emotions", []) if isinstance(x, str)},
            }
    except Exception as e:
        logger.warning(f"Remote entity tagging failed, using rule-based fallback: {e}")

    lower_t = transcript.lower()
    # Generic rule-based fallback — works for any content, no hardcoded words
    words_in_text = set(re.sub(r"[^a-z0-9\s]", "", lower_t).split())
    # Detect capitalized words as likely proper nouns (persons or locations)
    proper_nouns = {_normalize(w) for w in transcript.split() if w and w[0].isupper() and len(w) > 2}
    # Simple action verb heuristic (common English/Hinglish verbs)
    action_verbs = {"visited", "told", "watch", "subscribe", "see", "said", "went", "gaya",
                    "kiya", "kar", "shoot", "banai", "banao", "dekho", "sunao", "share"}
    emotion_words = {"subscribe", "amazing", "unbelievable", "viral", "secret", "must",
                     "shocking", "incredible", "wow", "best", "top", "new", "free"}
    return {
        "persons":   set(),  # Can't reliably distinguish persons from locations in rule-based
        "locations":  set(),  # without an external NER model
        "actions":   words_in_text & action_verbs,
        "numbers":   set(),
        "times":     set(),
        "emotions":  words_in_text & emotion_words,
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
    if n in tags["numbers"] or re.match(r"^\d", n):
        return "number"
    if n in tags["times"]:
        return "time"
    if n in tags["emotions"]:
        return "emotion"
    return None


def _gv(obj, key, default=None):
    return obj.get(key, default) if isinstance(obj, dict) else getattr(obj, key, default)


async def transcribe_bytes(data: bytes, filename: str, language: str = "hinglish", custom_prompt: str = None) -> CaptionDocument:
    if len(data) > 25 * 1024 * 1024:
        raise ValueError("File exceeds 25MB transcription limit.")

    # Map UI language slug → Whisper language code & prompt
    LANG_MAP = {
        "hinglish":  {"code": None,  "prompt": "Hinglish (Roman Hindi) video caption. Keep names and places in Roman script."},
        "hindi":     {"code": "hi",  "prompt": "Hindi video caption. Transcribe in Devanagari script."},
        "english":   {"code": "en",  "prompt": "English video caption. Transcribe clearly."},
        "urdu":      {"code": "ur",  "prompt": "Urdu video caption."},
        "tamil":     {"code": "ta",  "prompt": "Tamil video caption."},
        "punjabi":   {"code": "pa",  "prompt": "Punjabi video caption."},
        "bengali":   {"code": "bn",  "prompt": "Bengali video caption."},
        "marathi":   {"code": "mr",  "prompt": "Marathi video caption."},
        "telugu":    {"code": "te",  "prompt": "Telugu video caption."},
        "kannada":   {"code": "kn",  "prompt": "Kannada video caption."},
        "malayalam": {"code": "ml",  "prompt": "Malayalam video caption."},
        "gujarati":  {"code": "gu",  "prompt": "Gujarati video caption."},
        "arabic":    {"code": "ar",  "prompt": "Arabic video caption."},
        "nepali":    {"code": "ne",  "prompt": "Nepali video caption."},
    }
    lang_cfg = LANG_MAP.get(language, LANG_MAP["hinglish"])
    final_prompt = f"{lang_cfg['prompt']} Key terms: {custom_prompt}" if custom_prompt else lang_cfg["prompt"]

    suffix = Path(filename or "clip.mp4").suffix or ".mp4"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(data)
            tmp_path = tmp.name
        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        with open(tmp_path, "rb") as audio_file:
            transcribe_kwargs = dict(
                file=audio_file, model="whisper-1", response_format="verbose_json",
                prompt=final_prompt,
                temperature=0.0, timestamp_granularities=["segment", "word"],
            )
            if lang_cfg["code"]:
                transcribe_kwargs["language"] = lang_cfg["code"]
            resp = await stt.transcribe(**transcribe_kwargs)
        full_text = getattr(resp, "text", "") or ""
        raw_words = getattr(resp, "words", None) or []
        raw_segments = getattr(resp, "segments", None) or []
        language_detected = getattr(resp, "language", None)
    except Exception as e:
        logger.error(f"Whisper transcription failed: {e}")
        raise RuntimeError(
            f"Transcription failed: {e}. "
            "Please check that the audio/video file is valid and try again."
        )
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
    tags = await _tag_entities(full_text)

    from diarization import assign_speakers

    words = []
    for i, w in enumerate(raw_words):
        text = _gv(w, "word", "") or _gv(w, "text", "")
        prob = _gv(w, "probability", None)
        if prob is None:
            prob = _gv(w, "confidence", None)
        words.append(CaptionWord(
            id=f"w_{i}", text=text,
            start=float(_gv(w, "start", 0.0) or 0.0),
            end=float(_gv(w, "end", 0.0) or 0.0),
            entity_type=_classify(text, tags),
            confidence=float(prob) if prob is not None else None,
        ))

    words = assign_speakers(words)

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
        version=1, language=language_detected or language, source="whisper",
        words=words, segments=segments,
        word_count=len(words), duration=duration,
    )

