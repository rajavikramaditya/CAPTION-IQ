from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import re
import logging
import tempfile
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional

from emergentintegrations.llm.openai import OpenAISpeechToText
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------- Models ----------

class WordToken(BaseModel):
    text: str
    start: float
    end: float
    entity_type: Optional[str] = None  # person | location | action | None

class Segment(BaseModel):
    start: float
    end: float
    text: str

class TranscriptionResult(BaseModel):
    text: str
    words: List[WordToken]
    segments: List[Segment]

# ---------- Helpers ----------

def _normalize(w: str) -> str:
    return re.sub(r'[^a-z0-9]', '', w.lower())

TAG_SYSTEM = (
    "You are a linguistic entity tagger for Hinglish (Roman Hindi) and English video captions. "
    "Given a transcript, identify words that are Person names, Locations (cities, places, countries), "
    "and Action verbs (words describing an action, e.g. shoot, gaya, banai, editing, khaya). "
    "Return STRICT JSON only, no markdown, in the shape: "
    '{"persons": ["..."], "locations": ["..."], "actions": ["..."]}. '
    "Use the exact word tokens as they appear (without surrounding punctuation). "
    "Be precise: only clear person names, clear places, and clear action verbs."
)

async def tag_entities(transcript: str) -> dict:
    """Ask the LLM to classify words into person / location / action."""
    if not transcript.strip():
        return {"persons": [], "locations": [], "actions": []}
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id="captioniq-tagger",
        system_message=TAG_SYSTEM,
    ).with_model("openai", "gpt-5.4")
    msg = UserMessage(text=f"Transcript:\n{transcript}\n\nReturn the JSON now.")
    try:
        raw = await chat.send_message(msg)
    except Exception as e:
        logger.error(f"Entity tagging failed: {e}")
        return {"persons": [], "locations": [], "actions": []}
    raw = raw.strip()
    m = re.search(r'\{.*\}', raw, re.DOTALL)
    if m:
        raw = m.group(0)
    try:
        data = json.loads(raw)
    except Exception:
        logger.error(f"Could not parse tagger JSON: {raw[:200]}")
        return {"persons": [], "locations": [], "actions": []}
    return {
        "persons": [ _normalize(x) for x in data.get("persons", []) if isinstance(x, str) ],
        "locations": [ _normalize(x) for x in data.get("locations", []) if isinstance(x, str) ],
        "actions": [ _normalize(x) for x in data.get("actions", []) if isinstance(x, str) ],
    }

def classify(word: str, tags: dict) -> Optional[str]:
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

# ---------- Routes ----------

@api_router.get("/")
async def root():
    return {"message": "CaptionIQ API"}

@api_router.post("/transcribe", response_model=TranscriptionResult)
async def transcribe(file: UploadFile = File(...)):
    contents = await file.read()
    if len(contents) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File exceeds 25MB limit for transcription.")

    suffix = Path(file.filename or "clip.mp4").suffix or ".mp4"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        with open(tmp_path, "rb") as audio_file:
            resp = await stt.transcribe(
                file=audio_file,
                model="whisper-1",
                response_format="verbose_json",
                prompt="Hinglish (Roman Hindi) video caption. Keep names and places in Roman script.",
                temperature=0.0,
                timestamp_granularities=["segment", "word"],
            )
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise HTTPException(status_code=502, detail=f"Transcription failed: {e}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)

    full_text = getattr(resp, "text", "") or ""

    raw_words = getattr(resp, "words", None) or []
    raw_segments = getattr(resp, "segments", None) or []

    def gv(obj, key, default=None):
        if isinstance(obj, dict):
            return obj.get(key, default)
        return getattr(obj, key, default)

    tags = await tag_entities(full_text)

    words: List[WordToken] = []
    for w in raw_words:
        text = gv(w, "word", "") or gv(w, "text", "")
        words.append(WordToken(
            text=text,
            start=float(gv(w, "start", 0.0) or 0.0),
            end=float(gv(w, "end", 0.0) or 0.0),
            entity_type=classify(text, tags),
        ))

    segments: List[Segment] = []
    for s in raw_segments:
        segments.append(Segment(
            start=float(gv(s, "start", 0.0) or 0.0),
            end=float(gv(s, "end", 0.0) or 0.0),
            text=(gv(s, "text", "") or "").strip(),
        ))

    # Fallback: if no word timestamps, synthesize from segments
    if not words and segments:
        for s in segments:
            toks = s.text.split()
            if not toks:
                continue
            dur = max(s.end - s.start, 0.01)
            step = dur / len(toks)
            for i, tk in enumerate(toks):
                st = s.start + i * step
                words.append(WordToken(
                    text=tk, start=st, end=st + step,
                    entity_type=classify(tk, tags),
                ))

    return TranscriptionResult(text=full_text, words=words, segments=segments)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
