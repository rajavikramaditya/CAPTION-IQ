"""
Diarization helper — simple silence-based heuristic speaker assignment.
Toggles speaker (speaker_a / speaker_b) whenever silence between words exceeds silence_threshold seconds.
"""
from typing import List
from models import CaptionWord


def assign_speakers(words: List[CaptionWord], silence_threshold: float = 1.6) -> List[CaptionWord]:
    if not words:
        return words

    current_speaker = "speaker_a"
    for i, w in enumerate(words):
        if i > 0:
            gap = w.start - words[i - 1].end
            if gap >= silence_threshold:
                current_speaker = "speaker_b" if current_speaker == "speaker_a" else "speaker_a"
        w.speaker_id = current_speaker

    return words
