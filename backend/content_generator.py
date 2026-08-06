"""
AI Content Intelligence Engine — the core "magic" of CaptionIQ.

Given a full transcript, generate:
  - Video Summary (2-3 lines)
  - Viral Hook (1 punchy opener sentence)
  - YouTube Title (SEO-optimized, <70 chars)
  - Instagram Caption (with hashtags, emoji)
  - LinkedIn Caption (professional, storytelling)
  - Hashtags (10 relevant, trending)
  - SEO Keywords (for YouTube/blog)
  - CTA Suggestion (call-to-action phrase)

Uses gpt-5.4 via emergentintegrations (same key as transcription.py).
All generation is language-aware — works for Hinglish, English, mixed.
"""
import os
import re
import json
import logging

from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

CONTENT_SYSTEM = (
    "You are a world-class social media strategist and content creator assistant "
    "specializing in Indian creators making content in Hindi, Hinglish (Roman Hindi), and English. "
    "Given a video transcript, generate social media content that maximizes reach and engagement. "
    "Match the language and tone of the original transcript. "
    "If transcript is in Hinglish, write captions in Hinglish too (Roman script). "
    "Return ONLY valid JSON — no markdown, no extra text. "
    "Use the following exact JSON schema:\n"
    "{\n"
    '  "summary": "string (2-3 line video summary)",\n'
    '  "hook": "string (1 punchy viral opener, <15 words)",\n'
    '  "youtube_title": "string (SEO-optimized, <70 chars)",\n'
    '  "instagram_caption": "string (engaging, with emojis, 3-5 sentences)",\n'
    '  "linkedin_caption": "string (professional storytelling, 3-4 sentences)",\n'
    '  "hashtags": ["array", "of", "10", "hashtags", "without", "# prefix"],\n'
    '  "seo_keywords": ["array", "of", "8", "keywords"],\n'
    '  "cta": "string (one clear call-to-action, <12 words)"\n'
    "}"
)


def _extract_json(raw: str) -> dict | None:
    """Extract first JSON object from model output, handling markdown code fences."""
    # Remove markdown code fences if present
    raw = re.sub(r"```(?:json)?", "", raw).strip()
    m = re.search(r"\{.*\}", raw, re.DOTALL)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except Exception:
        return None


async def generate_content(transcript: str, language: str = "en") -> dict:
    """
    Generate AI social media content from a video transcript.
    Returns a dict with all content fields, or empty strings on failure.
    """
    empty = {
        "summary": "", "hook": "", "youtube_title": "",
        "instagram_caption": "", "linkedin_caption": "",
        "hashtags": [], "seo_keywords": [], "cta": "",
    }

    if not transcript or not transcript.strip():
        return empty

    # Truncate to ~3000 words to stay within token limits
    words = transcript.split()
    if len(words) > 3000:
        transcript = " ".join(words[:3000]) + "..."

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id="captioniq-content-gen",
        system_message=CONTENT_SYSTEM,
    ).with_model("openai", "gpt-5.4")

    prompt = (
        f"Video transcript (language hint: {language or 'auto'}):\n\n"
        f"{transcript}\n\n"
        "Generate all social media content now. Return JSON only."
    )

    try:
        raw = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:
        logger.error(f"Content generation LLM call failed: {e}")
        return empty

    data = _extract_json(raw)
    if not data:
        logger.warning("Content generation returned unparsable response")
        return empty

    # Sanitise and fill defaults
    return {
        "summary": str(data.get("summary", "")).strip(),
        "hook": str(data.get("hook", "")).strip(),
        "youtube_title": str(data.get("youtube_title", "")).strip(),
        "instagram_caption": str(data.get("instagram_caption", "")).strip(),
        "linkedin_caption": str(data.get("linkedin_caption", "")).strip(),
        "hashtags": [str(h).strip().lstrip("#") for h in data.get("hashtags", []) if h][:15],
        "seo_keywords": [str(k).strip() for k in data.get("seo_keywords", []) if k][:12],
        "cta": str(data.get("cta", "")).strip(),
    }
