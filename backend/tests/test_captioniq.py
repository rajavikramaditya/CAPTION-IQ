"""
CaptionIQ backend tests
- Health check
- POST /api/transcribe with a real speech MP3 (Whisper + LLM entity tagging)
- POST /api/transcribe rejects files >25MB with HTTP 413
"""
import os
import io
import pytest
import requests

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/')

SPEECH_FILE = "/app/test_fixtures/speech.mp3"   # "Rahul went to Mumbai and shot a video with Priya in Delhi"
EXPECTED_KEYWORDS = ["rahul", "mumbai", "delhi", "priya", "video", "shot"]


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    return s


class TestHealth:
    def test_root(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "message" in data
        assert "CaptionIQ" in data["message"]


class TestTranscribe:
    def test_transcribe_real_speech(self, api_client):
        assert os.path.exists(SPEECH_FILE), f"Missing fixture {SPEECH_FILE}"
        with open(SPEECH_FILE, "rb") as f:
            files = {"file": ("speech.mp3", f, "audio/mpeg")}
            r = api_client.post(f"{BASE_URL}/api/transcribe", files=files, timeout=180)
        assert r.status_code == 200, f"status={r.status_code} body={r.text[:400]}"
        data = r.json()
        # Structure assertions
        assert set(["text", "words", "segments"]).issubset(data.keys())
        assert isinstance(data["text"], str) and data["text"].strip(), "Empty transcript text"
        assert isinstance(data["words"], list) and len(data["words"]) > 0, "No words returned"
        assert isinstance(data["segments"], list)
        # Word shape
        w0 = data["words"][0]
        for key in ("text", "start", "end", "entity_type"):
            assert key in w0, f"Missing key {key} in word {w0}"
        # Keyword overlap: at least 2 of the expected keywords should appear
        text_low = data["text"].lower()
        hits = [kw for kw in EXPECTED_KEYWORDS if kw in text_low]
        assert len(hits) >= 2, f"Only {hits} keywords in transcript: {data['text']!r}"
        # Store results for next test
        pytest.transcribe_data = data

    def test_entity_tagging_populates(self, api_client):
        data = getattr(pytest, "transcribe_data", None)
        if data is None:
            pytest.skip("Prior transcription test didn't run")
        entities = {w.get("entity_type") for w in data["words"] if w.get("entity_type")}
        # We expect the LLM tagger to tag at least one of person/location/action
        assert entities, f"No entity_type tagged on any word. Sample words: {data['words'][:8]}"
        # Optional: person or location should ideally appear (Rahul/Mumbai/Delhi/Priya)
        allowed = {"person", "location", "action"}
        assert entities.issubset(allowed), f"Unexpected entity types {entities}"

    def test_transcribe_rejects_oversize(self, api_client):
        # Generate 26MB of garbage bytes
        big = io.BytesIO(b"\x00" * (26 * 1024 * 1024))
        files = {"file": ("big.mp3", big, "audio/mpeg")}
        r = api_client.post(f"{BASE_URL}/api/transcribe", files=files, timeout=120)
        assert r.status_code == 413, f"expected 413 got {r.status_code} body={r.text[:200]}"
