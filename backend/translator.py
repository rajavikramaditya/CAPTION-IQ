"""
AI Subtitle Translation Engine — translate CaptionDocument to target language while preserving word timestamps.
"""
import os
import re
import json
import logging
from typing import Dict, Any

from emergentintegrations.llm.chat import LlmChat, UserMessage
from models import CaptionDocument, CaptionWord, CaptionSegment

logger = logging.getLogger(__name__)
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

TRANSLATE_SYSTEM = (
    "You are a professional subtitle translator. "
    "Given a list of original caption segments, translate each segment into the requested target language. "
    "Keep translations natural, concise, and easy to read as subtitles. "
    "Return STRICT JSON only, matching format: {\"translations\": [\"translated seg 1\", \"translated seg 2\"]}"
)


async def translate_caption_doc(doc: CaptionDocument, target_lang: str) -> CaptionDocument:
    """
    Translate CaptionDocument segments into target_lang (e.g. 'english', 'hindi', 'hinglish', 'spanish').
    Preserves exact word timing boundaries.
    """
    if not doc.segments:
        return doc

    segment_texts = [s.text for s in doc.segments]
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id="captioniq-translator",
        system_message=TRANSLATE_SYSTEM,
    ).with_model("openai", "gpt-5.4")

    prompt = (
        f"Target Language: {target_lang}\n"
        f"Original Segments:\n{json.dumps(segment_texts, ensure_ascii=False)}\n\n"
        "Return the JSON translation array now."
    )

    try:
        raw = await chat.send_message(UserMessage(text=prompt))
        m = re.search(r"\{.*\}", raw.strip(), re.DOTALL)
        if m:
            data = json.loads(m.group(0))
            translations = data.get("translations", [])
        else:
            translations = []
    except Exception as e:
        logger.error(f"Translation failed: {e}")
        translations = []

    if len(translations) != len(doc.segments):
        logger.warning(f"Translation segment count mismatch: got {len(translations)}, expected {len(doc.segments)}")
        return doc

    # Build new words and segments
    new_words = []
    new_segments = []
    word_idx = 0

    for i, seg in enumerate(doc.segments):
        tr_text = translations[i] if i < len(translations) else seg.text
        words_in_tr = tr_text.split()
        if not words_in_tr:
            continue

        step = max(seg.end - seg.start, 0.01) / len(words_in_tr)
        seg_word_ids = []

        for j, tk in enumerate(words_in_tr):
            st = seg.start + j * step
            wid = f"w_tr_{word_idx}"
            new_words.append(CaptionWord(
                id=wid,
                text=tk,
                start=st,
                end=st + step,
                entity_type=None,
            ))
            seg_word_ids.append(wid)
            word_idx += 1

        new_segments.append(CaptionSegment(
            id=f"s_tr_{i}",
            start=seg.start,
            end=seg.end,
            word_ids=seg_word_ids,
            text=tr_text,
        ))

    return CaptionDocument(
        version=doc.version,
        language=target_lang,
        source=f"translated_{target_lang}",
        words=new_words,
        segments=new_segments,
        word_count=len(new_words),
        duration=doc.duration,
        style=doc.style,
    )
