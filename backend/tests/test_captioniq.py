"""CaptionIQ v1 backend tests.

Covers:
- Health
- Auth (register, login, wrong pw, brute-force lockout, /me via Bearer & cookie,
  logout, refresh, Google OAuth via mongo-injected session)
- Projects CRUD + ownership isolation
- Media upload/stream + HTTP Range 206
- REAL Whisper + gpt-5.4 entity-tag transcribe (persists caption_document)
- Caption update
"""
import os
import io
import uuid
import time
import pytest
import requests
from datetime import datetime, timezone, timedelta

from pymongo import MongoClient

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

SPEECH_FILE = "/app/test_fixtures/speech.mp3"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "captioniq")


# ---------- session fixtures ----------
@pytest.fixture(scope="module")
def mongo():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    c.close()


@pytest.fixture(scope="module")
def s():
    return requests.Session()


def _rand_email(prefix="test"):
    return f"test_{prefix}_{uuid.uuid4().hex[:8]}@example.com"


# =========================================================
# 1) HEALTH
# =========================================================
class TestHealth:
    def test_root(self, s):
        r = s.get(f"{API}/", timeout=30)
        assert r.status_code == 200
        assert "CaptionIQ" in r.json().get("message", "")


# =========================================================
# 2) AUTH: register / login / me / logout / refresh
# =========================================================
class TestAuth:
    def test_full_auth_flow(self, s, mongo):
        email = _rand_email("auth")
        password = "TestPass1!"
        name = "Auth User"

        # register
        r = s.post(f"{API}/auth/register",
                   json={"email": email, "password": password, "name": name}, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "user" in body and "access_token" in body
        assert body["user"]["email"] == email
        assert body["user"]["auth_provider"] == "password"
        token = body["access_token"]
        assert isinstance(token, str) and len(token) > 20

        # cookies set (register response)
        assert any(c.name == "access_token" for c in r.cookies) or "access_token" in r.headers.get("set-cookie", "").lower()

        # /me via Bearer
        r = requests.get(f"{API}/auth/me",
                         headers={"Authorization": f"Bearer {token}"}, timeout=15)
        assert r.status_code == 200, r.text
        me = r.json()
        assert me["email"] == email

        # /me via cookie (using session cookies)
        r = s.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["email"] == email

        # /me without token -> 401
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401

        # login with correct password
        r = s.post(f"{API}/auth/login",
                   json={"email": email, "password": password}, timeout=15)
        assert r.status_code == 200
        assert "access_token" in r.json()

        # login with wrong password -> 401
        r = requests.post(f"{API}/auth/login",
                          json={"email": email, "password": "wrong-pw"}, timeout=15)
        assert r.status_code == 401

        # refresh (using cookies in session s)
        r = s.post(f"{API}/auth/refresh", timeout=15)
        assert r.status_code == 200, r.text
        assert "access_token" in r.json()

        # logout clears cookies
        r = s.post(f"{API}/auth/logout", timeout=15)
        assert r.status_code == 200
        # After logout, /me via cookie should 401
        r_after = s.get(f"{API}/auth/me", timeout=15)
        assert r_after.status_code == 401

    def test_register_duplicate_email(self, s):
        email = _rand_email("dup")
        payload = {"email": email, "password": "TestPass1!", "name": "Dup"}
        r1 = requests.post(f"{API}/auth/register", json=payload, timeout=15)
        assert r1.status_code == 200
        r2 = requests.post(f"{API}/auth/register", json=payload, timeout=15)
        assert r2.status_code == 400


# =========================================================
# 3) BRUTE-FORCE: 5 wrong logins -> 429
# =========================================================
class TestBruteForce:
    def test_five_wrong_logins_lockout(self, mongo):
        email = _rand_email("brute")
        # create user
        r = requests.post(f"{API}/auth/register",
                          json={"email": email, "password": "GoodPass1!", "name": "Brute"}, timeout=15)
        assert r.status_code == 200

        codes = []
        for _ in range(5):
            r = requests.post(f"{API}/auth/login",
                              json={"email": email, "password": "wrong"}, timeout=15)
            codes.append(r.status_code)
        # all five should be 401
        assert all(c == 401 for c in codes), f"expected 5x401 got {codes}"

        # 6th attempt -> 429 (even with correct password since IP+email is locked)
        r = requests.post(f"{API}/auth/login",
                          json={"email": email, "password": "GoodPass1!"}, timeout=15)
        assert r.status_code == 429, f"expected 429, got {r.status_code}: {r.text}"


# =========================================================
# 4) GOOGLE OAUTH: simulate mongo user + session -> /me with Bearer session_token
# =========================================================
class TestGoogleOAuthSim:
    def test_session_token_via_mongo(self, mongo):
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        email = _rand_email("google")
        session_token = uuid.uuid4().hex

        mongo.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": "Google User",
            "picture": None,
            "role": "user",
            "auth_provider": "google",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        mongo.user_sessions.insert_one({
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            "created_at": datetime.now(timezone.utc),
        })

        r = requests.get(f"{API}/auth/me",
                         headers={"Authorization": f"Bearer {session_token}"}, timeout=15)
        assert r.status_code == 200, r.text
        me = r.json()
        assert me["email"] == email
        assert me["auth_provider"] == "google"


# =========================================================
# 5) PROJECTS CRUD + ownership isolation
# =========================================================
class TestProjects:
    @pytest.fixture(scope="class")
    def user_a(self):
        email = _rand_email("userA")
        r = requests.post(f"{API}/auth/register",
                          json={"email": email, "password": "Aaa11111", "name": "A"}, timeout=15)
        assert r.status_code == 200
        return {"email": email, "token": r.json()["access_token"]}

    @pytest.fixture(scope="class")
    def user_b(self):
        email = _rand_email("userB")
        r = requests.post(f"{API}/auth/register",
                          json={"email": email, "password": "Bbb11111", "name": "B"}, timeout=15)
        assert r.status_code == 200
        return {"email": email, "token": r.json()["access_token"]}

    def _hdr(self, u):
        return {"Authorization": f"Bearer {u['token']}"}

    def test_no_auth_rejected(self):
        r = requests.get(f"{API}/projects", timeout=15)
        assert r.status_code == 401

    def test_create_list_get_delete(self, user_a):
        # empty list initially (fresh user)
        r = requests.get(f"{API}/projects", headers=self._hdr(user_a), timeout=15)
        assert r.status_code == 200
        assert r.json() == []

        # create
        r = requests.post(f"{API}/projects",
                          headers=self._hdr(user_a),
                          json={"title": "TEST_MyProj"}, timeout=15)
        assert r.status_code == 200
        p = r.json()
        assert p["title"] == "TEST_MyProj"
        assert p["status"] == "draft"
        assert p["media_id"] is None
        assert "caption_document" in p
        assert p["caption_document"]["words"] == []
        assert p["caption_document"]["word_count"] == 0
        pid = p["project_id"]

        # list has 1 item
        r = requests.get(f"{API}/projects", headers=self._hdr(user_a), timeout=15)
        assert r.status_code == 200
        arr = r.json()
        assert len(arr) == 1
        assert arr[0]["project_id"] == pid
        assert arr[0]["has_media"] is False

        # get full
        r = requests.get(f"{API}/projects/{pid}", headers=self._hdr(user_a), timeout=15)
        assert r.status_code == 200
        assert r.json()["project_id"] == pid

        # delete
        r = requests.delete(f"{API}/projects/{pid}", headers=self._hdr(user_a), timeout=15)
        assert r.status_code == 200

        # get after delete -> 404
        r = requests.get(f"{API}/projects/{pid}", headers=self._hdr(user_a), timeout=15)
        assert r.status_code == 404

    def test_ownership_isolation(self, user_a, user_b):
        # user A creates a project
        r = requests.post(f"{API}/projects",
                          headers=self._hdr(user_a),
                          json={"title": "TEST_ownedByA"}, timeout=15)
        assert r.status_code == 200
        pid = r.json()["project_id"]

        # user B tries to fetch it -> 404 (isolation)
        r = requests.get(f"{API}/projects/{pid}", headers=self._hdr(user_b), timeout=15)
        assert r.status_code == 404

        # user B's list must NOT include it
        r = requests.get(f"{API}/projects", headers=self._hdr(user_b), timeout=15)
        assert r.status_code == 200
        assert all(x["project_id"] != pid for x in r.json())

        # user B tries to delete it -> 404
        r = requests.delete(f"{API}/projects/{pid}", headers=self._hdr(user_b), timeout=15)
        assert r.status_code == 404


# =========================================================
# 6) MEDIA upload + stream (Range) + 7) TRANSCRIBE + 8) CAPTION SAVE
# Runs sequentially with a shared user + project.
# =========================================================
class TestMediaAndTranscribe:
    @pytest.fixture(scope="class")
    def user(self):
        email = _rand_email("media")
        r = requests.post(f"{API}/auth/register",
                          json={"email": email, "password": "MediaPass1!", "name": "Media"}, timeout=15)
        assert r.status_code == 200
        return {"email": email, "token": r.json()["access_token"]}

    @pytest.fixture(scope="class")
    def project_id(self, user):
        r = requests.post(f"{API}/projects",
                          headers={"Authorization": f"Bearer {user['token']}"},
                          json={"title": "TEST_transcribe"}, timeout=15)
        assert r.status_code == 200
        return r.json()["project_id"]

    def test_upload_speech_mp3(self, user, project_id):
        assert os.path.exists(SPEECH_FILE), f"fixture missing: {SPEECH_FILE}"
        with open(SPEECH_FILE, "rb") as f:
            r = requests.post(
                f"{API}/projects/{project_id}/media",
                headers={"Authorization": f"Bearer {user['token']}"},
                files={"file": ("speech.mp3", f, "audio/mpeg")},
                data={"duration": "3.5"},
                timeout=90,
            )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["media_id"]
        assert body["size"] > 1000

        # GET /projects/{id} now has media_id
        r = requests.get(f"{API}/projects/{project_id}",
                         headers={"Authorization": f"Bearer {user['token']}"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["media_id"] == body["media_id"]

    def test_stream_full(self, user, project_id):
        r = requests.get(f"{API}/projects/{project_id}/media",
                         headers={"Authorization": f"Bearer {user['token']}"}, timeout=60)
        assert r.status_code == 200, r.text
        assert r.headers.get("Accept-Ranges") == "bytes"
        assert len(r.content) > 1000

    def test_stream_range_206(self, user, project_id):
        r = requests.get(f"{API}/projects/{project_id}/media",
                         headers={"Authorization": f"Bearer {user['token']}",
                                  "Range": "bytes=0-999"}, timeout=60)
        assert r.status_code == 206, r.text
        cr = r.headers.get("Content-Range", "")
        assert cr.startswith("bytes 0-999/"), f"Bad Content-Range: {cr}"
        assert len(r.content) == 1000

    def test_transcribe_real(self, user, project_id, mongo):
        """REAL Whisper + gpt-5.4 entity tag; persists caption_document."""
        r = requests.post(f"{API}/projects/{project_id}/transcribe",
                          headers={"Authorization": f"Bearer {user['token']}"},
                          timeout=180)
        assert r.status_code == 200, f"transcribe failed: {r.status_code} {r.text[:400]}"
        doc = r.json()
        assert doc["source"] == "whisper"
        assert isinstance(doc["words"], list) and len(doc["words"]) > 0
        # word shape
        w0 = doc["words"][0]
        for k in ("id", "text", "start", "end"):
            assert k in w0
        # entity tags — at least one word should be tagged
        entities = {w.get("entity_type") for w in doc["words"] if w.get("entity_type")}
        assert entities, "no entity_type populated by gpt-5.4 tagger"
        assert entities.issubset({"person", "location", "action", "number", "time", "emotion"}), entities

        # persistence: reopen project
        r = requests.get(f"{API}/projects/{project_id}",
                         headers={"Authorization": f"Bearer {user['token']}"}, timeout=15)
        assert r.status_code == 200
        p = r.json()
        assert p["status"] == "ready"
        assert p["caption_document"]["word_count"] == len(doc["words"])
        assert len(p["caption_document"]["words"]) == len(doc["words"])

        # job + usage_event were created
        job = mongo.jobs.find_one({"project_id": project_id, "type": "transcription"})
        assert job is not None
        assert job["status"] == "done"
        usage = mongo.usage_events.find_one({"project_id": project_id, "type": "transcription"})
        assert usage is not None
        assert usage["unit"] == "seconds"

    def test_caption_save(self, user, project_id):
        # Load current
        r = requests.get(f"{API}/projects/{project_id}",
                         headers={"Authorization": f"Bearer {user['token']}"}, timeout=15)
        assert r.status_code == 200
        doc = r.json()["caption_document"]
        # Edit: mark first word emphasis=True
        if doc["words"]:
            doc["words"][0]["emphasis"] = True
            doc["words"][0]["text"] = doc["words"][0]["text"].upper()

        r = requests.put(f"{API}/projects/{project_id}/caption",
                         headers={"Authorization": f"Bearer {user['token']}"},
                         json={"caption_document": doc}, timeout=15)
        assert r.status_code == 200, r.text

        # Verify persisted
        r = requests.get(f"{API}/projects/{project_id}",
                         headers={"Authorization": f"Bearer {user['token']}"}, timeout=15)
        assert r.status_code == 200
        saved = r.json()["caption_document"]
        if saved["words"]:
            assert saved["words"][0]["emphasis"] is True
            assert saved["words"][0]["text"] == doc["words"][0]["text"]
