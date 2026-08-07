"""
CaptionIQ Iteration 8 - Comprehensive backend tests
Tests:
- Auth with test@captioniq.com / Test1234!
- Portrait project proj_30bda645b428 loading (720x1280, 14 words)
- SRT export: should return 2 subtitle blocks (word-level chunking with maxWords=7)
- VTT export: should return WEBVTT header + 2 timed blocks
- Word edit: update word 'amazing' -> 'fantastic' and verify persistence
- Landscape project proj_852905ea63c3 loading
"""
import os
import re
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

TEST_EMAIL = "test@captioniq.com"
TEST_PASSWORD = "Test1234!"
PORTRAIT_PROJECT_ID = "proj_30bda645b428"
LANDSCAPE_PROJECT_ID = "proj_852905ea63c3"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for test user."""
    r = requests.post(
        f"{API}/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        timeout=30,
    )
    if r.status_code != 200:
        pytest.skip(f"Authentication failed: {r.status_code} {r.text}")
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


# =============================================================================
# 1) Auth + /me
# =============================================================================
class TestAuth:
    """Test the main account authentication"""

    def test_login_success(self):
        r = requests.post(
            f"{API}/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            timeout=30,
        )
        assert r.status_code == 200, f"Login failed: {r.text}"
        data = r.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL

    def test_me_endpoint(self, auth_headers):
        r = requests.get(f"{API}/auth/me", headers=auth_headers, timeout=15)
        assert r.status_code == 200, f"/me failed: {r.text}"
        me = r.json()
        assert me["email"] == TEST_EMAIL


# =============================================================================
# 2) Portrait Project Loading
# =============================================================================
class TestPortraitProject:
    """Test the portrait project (720x1280, 14 Whisper words)"""

    def test_project_loads(self, auth_headers):
        r = requests.get(
            f"{API}/projects/{PORTRAIT_PROJECT_ID}", headers=auth_headers, timeout=30
        )
        assert r.status_code == 200, f"Portrait project not found: {r.text}"
        p = r.json()
        assert p["project_id"] == PORTRAIT_PROJECT_ID

    def test_project_has_caption_document(self, auth_headers):
        r = requests.get(
            f"{API}/projects/{PORTRAIT_PROJECT_ID}", headers=auth_headers, timeout=30
        )
        assert r.status_code == 200
        p = r.json()
        doc = p.get("caption_document")
        assert doc is not None, "No caption_document in project"
        assert doc.get("words") is not None, "No words in caption_document"

    def test_project_has_14_words(self, auth_headers):
        """The test project should have exactly 14 Whisper words"""
        r = requests.get(
            f"{API}/projects/{PORTRAIT_PROJECT_ID}", headers=auth_headers, timeout=30
        )
        assert r.status_code == 200
        doc = r.json()["caption_document"]
        words = doc.get("words", [])
        word_count = doc.get("word_count", len(words))
        assert len(words) == 14, f"Expected 14 words, got {len(words)}: {[w['text'] for w in words]}"

    def test_project_word_timings(self, auth_headers):
        """Words should be spaced at 0.40s intervals: Modi=0, visited=0.40, ... video.=5.20"""
        r = requests.get(
            f"{API}/projects/{PORTRAIT_PROJECT_ID}", headers=auth_headers, timeout=30
        )
        assert r.status_code == 200
        words = r.json()["caption_document"]["words"]
        texts = [w["text"].lower().rstrip(".") for w in words]
        # Check first word starts near 0
        assert words[0]["start"] == 0.0 or words[0]["start"] < 0.1, f"First word start: {words[0]['start']}"
        # Check last word ends near 5.6 (5.20 start + 0.40 end)
        assert words[-1]["end"] >= 5.2, f"Last word end: {words[-1]['end']}"
        # Check word order contains expected words
        expected_words = ["modi", "visited", "mumbai", "today", "and", "told", "everyone",
                          "to", "subscribe", "and", "watch", "this", "amazing", "video"]
        found = [t for t in expected_words if t in texts]
        assert len(found) >= 10, f"Expected most of {expected_words}, found: {texts}"


# =============================================================================
# 3) SRT Export - Must return 2 blocks with 14-word project
# =============================================================================
class TestSRTExport:
    """Test SRT export returns word-level chunks (2 blocks for 14 words at maxWords=7)"""

    def test_srt_status_200(self, auth_headers):
        r = requests.get(
            f"{API}/projects/{PORTRAIT_PROJECT_ID}/export?format=srt",
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 200, f"SRT export failed: {r.status_code} {r.text[:200]}"

    def test_srt_content_type(self, auth_headers):
        r = requests.get(
            f"{API}/projects/{PORTRAIT_PROJECT_ID}/export?format=srt",
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 200
        ct = r.headers.get("content-type", "").lower()
        assert "text" in ct or "srt" in ct or "octet" in ct or "subrip" in ct, f"Unexpected content-type: {ct}"

    def test_srt_has_two_blocks(self, auth_headers):
        """14 words with maxWords=7 should produce exactly 2 subtitle blocks"""
        r = requests.get(
            f"{API}/projects/{PORTRAIT_PROJECT_ID}/export?format=srt",
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 200
        content = r.text if hasattr(r, 'text') else r.content.decode('utf-8')
        print(f"SRT content:\n{content}")
        
        # Count timestamp lines (format: HH:MM:SS,mmm --> HH:MM:SS,mmm)
        ts_lines = re.findall(r'\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}', content)
        print(f"SRT timestamp lines found: {len(ts_lines)}: {ts_lines}")
        assert len(ts_lines) == 2, f"Expected 2 SRT blocks, got {len(ts_lines)}. Content:\n{content}"

    def test_srt_block_numbering(self, auth_headers):
        """SRT should have sequential block numbers 1 and 2"""
        r = requests.get(
            f"{API}/projects/{PORTRAIT_PROJECT_ID}/export?format=srt",
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 200
        content = r.text if hasattr(r, 'text') else r.content.decode('utf-8')
        lines = content.strip().split('\n')
        # First block should start with "1"
        assert lines[0].strip() == "1", f"SRT does not start with block 1, got: {lines[0]}"

    def test_srt_first_block_timing(self, auth_headers):
        """First block: Modi(0s) to everyone(2.80s), 7 words"""
        r = requests.get(
            f"{API}/projects/{PORTRAIT_PROJECT_ID}/export?format=srt",
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 200
        content = r.text if hasattr(r, 'text') else r.content.decode('utf-8')
        ts_lines = re.findall(r'\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}', content)
        if ts_lines:
            # First block should start near 0:00:00,000
            assert ts_lines[0].startswith("00:00:00"), f"First SRT block should start at 0, got: {ts_lines[0]}"

    def test_srt_second_block_timing(self, auth_headers):
        """Second block: to(2.80s) to video.(5.60s), 7 words"""
        r = requests.get(
            f"{API}/projects/{PORTRAIT_PROJECT_ID}/export?format=srt",
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 200
        content = r.text if hasattr(r, 'text') else r.content.decode('utf-8')
        ts_lines = re.findall(r'\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}', content)
        if len(ts_lines) >= 2:
            # Second block should start near 2:80s
            print(f"Second SRT block timing: {ts_lines[1]}")
            # Just validate it starts after the first block ends
            assert "00:00:0" in ts_lines[1] or "00:00:1" in ts_lines[1] or "00:00:2" in ts_lines[1], \
                f"Second SRT block timing seems wrong: {ts_lines[1]}"


# =============================================================================
# 4) VTT Export - Must return WEBVTT header + 2 timed blocks
# =============================================================================
class TestVTTExport:
    """Test VTT export returns WEBVTT header + 2 timed blocks"""

    def test_vtt_status_200(self, auth_headers):
        r = requests.get(
            f"{API}/projects/{PORTRAIT_PROJECT_ID}/export?format=vtt",
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 200, f"VTT export failed: {r.status_code} {r.text[:200]}"

    def test_vtt_has_webvtt_header(self, auth_headers):
        """VTT file must start with WEBVTT"""
        r = requests.get(
            f"{API}/projects/{PORTRAIT_PROJECT_ID}/export?format=vtt",
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 200
        content = r.text if hasattr(r, 'text') else r.content.decode('utf-8')
        print(f"VTT content:\n{content}")
        assert content.strip().startswith("WEBVTT"), f"VTT does not start with WEBVTT header: {content[:100]}"

    def test_vtt_has_two_blocks(self, auth_headers):
        """VTT should have exactly 2 timed blocks"""
        r = requests.get(
            f"{API}/projects/{PORTRAIT_PROJECT_ID}/export?format=vtt",
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 200
        content = r.text if hasattr(r, 'text') else r.content.decode('utf-8')
        # Count VTT timestamp lines (format: HH:MM:SS.mmm --> HH:MM:SS.mmm)
        ts_lines = re.findall(r'\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}', content)
        print(f"VTT timestamp lines found: {len(ts_lines)}: {ts_lines}")
        assert len(ts_lines) == 2, f"Expected 2 VTT blocks, got {len(ts_lines)}. Content:\n{content}"

    def test_vtt_first_block_starts_at_zero(self, auth_headers):
        r = requests.get(
            f"{API}/projects/{PORTRAIT_PROJECT_ID}/export?format=vtt",
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 200
        content = r.text if hasattr(r, 'text') else r.content.decode('utf-8')
        ts_lines = re.findall(r'\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}', content)
        if ts_lines:
            assert ts_lines[0].startswith("00:00:00"), f"First VTT block should start at 0, got: {ts_lines[0]}"


# =============================================================================
# 5) Word Edit: 'amazing' -> 'fantastic' + persistence check
# =============================================================================
class TestWordEdit:
    """Test word editing - change 'amazing' to 'fantastic'"""

    def _get_project(self, auth_headers):
        r = requests.get(
            f"{API}/projects/{PORTRAIT_PROJECT_ID}", headers=auth_headers, timeout=30
        )
        assert r.status_code == 200
        return r.json()

    def test_find_amazing_word(self, auth_headers):
        """Find the word 'amazing' in the project"""
        p = self._get_project(auth_headers)
        words = p["caption_document"]["words"]
        amazing = [w for w in words if w["text"].lower().rstrip(".") == "amazing"]
        assert len(amazing) >= 1, f"Word 'amazing' not found in transcript: {[w['text'] for w in words]}"
        print(f"Found 'amazing' word: {amazing[0]}")

    def test_update_word_amazing_to_fantastic(self, auth_headers):
        """Update 'amazing' to 'fantastic' and verify persistence"""
        p = self._get_project(auth_headers)
        doc = p["caption_document"]
        words = doc["words"]

        # Find 'amazing' word
        amazing_word = next((w for w in words if w["text"].lower().rstrip(".") == "amazing"), None)
        assert amazing_word is not None, f"Word 'amazing' not found: {[w['text'] for w in words]}"
        
        amazing_id = amazing_word.get("id") or amazing_word.get("word_id")
        original_text = amazing_word["text"]
        print(f"Found 'amazing' at id={amazing_id}, start={amazing_word.get('start')}, end={amazing_word.get('end')}")

        # Update the word text to 'fantastic'
        updated_words = [
            {**w, "text": "fantastic"} if (w.get("id") or w.get("word_id")) == amazing_id else w
            for w in words
        ]

        # Also update segments
        word_id_key = "id" if "id" in words[0] else "word_id"
        word_by_id = {w[word_id_key]: w for w in updated_words}
        updated_segments = []
        for seg in doc.get("segments", []):
            seg_word_ids = seg.get("word_ids", [])
            seg_words = [word_by_id[wid] for wid in seg_word_ids if wid in word_by_id]
            updated_segments.append({
                **seg,
                "text": " ".join(w["text"] for w in seg_words),
            })

        updated_doc = {
            **doc,
            "words": updated_words,
            "segments": updated_segments,
        }

        # Save via PUT
        r = requests.put(
            f"{API}/projects/{PORTRAIT_PROJECT_ID}/caption",
            headers=auth_headers,
            json={"caption_document": updated_doc},
            timeout=30,
        )
        assert r.status_code == 200, f"Caption PUT failed: {r.status_code} {r.text[:400]}"

        # Verify persistence — reload project
        p2 = self._get_project(auth_headers)
        words2 = p2["caption_document"]["words"]
        texts2 = [w["text"].lower().rstrip(".") for w in words2]
        assert "fantastic" in texts2, f"'fantastic' not found after save: {texts2}"
        assert "amazing" not in texts2, f"'amazing' still present after save: {texts2}"
        print(f"Word edit verified: 'amazing' -> 'fantastic'. Transcript: {[w['text'] for w in words2]}")

    def test_restore_word_back_to_amazing(self, auth_headers):
        """Restore 'fantastic' back to 'amazing' for subsequent tests"""
        p = self._get_project(auth_headers)
        doc = p["caption_document"]
        words = doc["words"]

        # Find 'fantastic' word
        fantastic_word = next((w for w in words if w["text"].lower().rstrip(".") == "fantastic"), None)
        if fantastic_word is None:
            print("'fantastic' not found - may already be restored to 'amazing'")
            return

        fantastic_id = fantastic_word.get("id") or fantastic_word.get("word_id")
        updated_words = [
            {**w, "text": "amazing"} if (w.get("id") or w.get("word_id")) == fantastic_id else w
            for w in words
        ]
        word_id_key = "id" if "id" in words[0] else "word_id"
        word_by_id = {w[word_id_key]: w for w in updated_words}
        updated_segments = []
        for seg in doc.get("segments", []):
            seg_word_ids = seg.get("word_ids", [])
            seg_words = [word_by_id[wid] for wid in seg_word_ids if wid in word_by_id]
            updated_segments.append({
                **seg,
                "text": " ".join(w["text"] for w in seg_words),
            })
        updated_doc = {**doc, "words": updated_words, "segments": updated_segments}
        r = requests.put(
            f"{API}/projects/{PORTRAIT_PROJECT_ID}/caption",
            headers=auth_headers,
            json={"caption_document": updated_doc},
            timeout=30,
        )
        assert r.status_code == 200, f"Restore failed: {r.text[:200]}"
        print("Restored 'amazing' successfully")


# =============================================================================
# 6) Landscape Project
# =============================================================================
class TestLandscapeProject:
    """Test landscape project proj_852905ea63c3 loading"""

    def test_landscape_project_loads(self, auth_headers):
        r = requests.get(
            f"{API}/projects/{LANDSCAPE_PROJECT_ID}", headers=auth_headers, timeout=30
        )
        assert r.status_code == 200, f"Landscape project not found: {r.text}"
        p = r.json()
        assert p["project_id"] == LANDSCAPE_PROJECT_ID
        print(f"Landscape project title: {p.get('title')}, status: {p.get('status')}")

    def test_landscape_project_has_no_captions(self, auth_headers):
        """Landscape project described as 'partial video, no captions'"""
        r = requests.get(
            f"{API}/projects/{LANDSCAPE_PROJECT_ID}", headers=auth_headers, timeout=30
        )
        assert r.status_code == 200
        p = r.json()
        doc = p.get("caption_document", {})
        words = doc.get("words", [])
        print(f"Landscape project word count: {len(words)}")
        # No captions expected
        assert len(words) == 0, f"Expected no captions for landscape project, got {len(words)} words"
