"""Object storage abstraction over Emergent-managed storage with local fallback."""
import os
import logging
from pathlib import Path
import requests

logger = logging.getLogger(__name__)

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "captioniq"

_storage_key = None
LOCAL_STORAGE_DIR = Path(__file__).parent / "local_storage"
LOCAL_STORAGE_DIR.mkdir(exist_ok=True)


def init_storage(force: bool = False):
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=15)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    if EMERGENT_KEY:
        try:
            key = init_storage()
            resp = requests.put(
                f"{STORAGE_URL}/objects/{path}",
                headers={"X-Storage-Key": key, "Content-Type": content_type},
                data=data, timeout=60,
            )
            if resp.status_code == 404:
                key = init_storage(force=True)
                resp = requests.put(
                    f"{STORAGE_URL}/objects/{path}",
                    headers={"X-Storage-Key": key, "Content-Type": content_type},
                    data=data, timeout=60,
                )
            if resp.status_code == 200:
                return resp.json()
        except Exception as e:
            logger.warning(f"Remote storage put failed, using local fallback: {e}")

    p = LOCAL_STORAGE_DIR / path.replace("/", "_")
    p.write_bytes(data)
    meta_p = p.with_suffix(p.suffix + ".meta")
    meta_p.write_text(content_type)
    return {"path": path, "size": len(data), "stored": "local"}


def get_object(path: str):
    if EMERGENT_KEY:
        try:
            key = init_storage()
            resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
            if resp.status_code == 404:
                key = init_storage(force=True)
                resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
            if resp.status_code == 200:
                return resp.content, resp.headers.get("Content-Type", "application/octet-stream")
        except Exception as e:
            logger.warning(f"Remote storage get failed, using local fallback: {e}")

    p = LOCAL_STORAGE_DIR / path.replace("/", "_")
    if p.exists():
        content_type = "application/octet-stream"
        meta_p = p.with_suffix(p.suffix + ".meta")
        if meta_p.exists():
            content_type = meta_p.read_text()
        return p.read_bytes(), content_type
    raise FileNotFoundError(f"Object {path} not found")
