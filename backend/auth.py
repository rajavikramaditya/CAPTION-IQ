"""Unified authentication: JWT email/password + Emergent Google OAuth.
Both resolve to a single users collection keyed by a UUID `user_id`."""
import os
import secrets
import logging
from datetime import datetime, timezone, timedelta

import bcrypt
import jwt
import requests
from fastapi import APIRouter, Request, Response, HTTPException, Depends

from database import db
from models import (
    RegisterRequest, LoginRequest, SessionRequest,
    ForgotPasswordRequest, ResetPasswordRequest, gen_id,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth")

JWT_ALGO = "HS256"
ACCESS_MIN = 15
REFRESH_DAYS = 7
SESSION_DAYS = 7
LOCKOUT_MAX = 5
LOCKOUT_MIN = 15
EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


def _secret() -> str:
    return os.environ["JWT_SECRET"]


# ---------- password ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8")[:72], hashed.encode("utf-8"))
    except Exception:
        return False


# ---------- jwt ----------
def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_MIN)}
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGO)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "type": "refresh",
               "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_DAYS)}
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGO)


def _set_jwt_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True,
                        samesite="none", max_age=ACCESS_MIN * 60, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True,
                        samesite="none", max_age=REFRESH_DAYS * 86400, path="/")


def _public(user: dict) -> dict:
    return {
        "user_id": user["user_id"], "email": user["email"], "name": user.get("name", ""),
        "picture": user.get("picture"), "role": user.get("role", "user"),
        "auth_provider": user.get("auth_provider", "password"),
        "created_at": user.get("created_at", ""),
    }


# ---------- resolvers ----------
async def _user_from_jwt(token: str):
    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGO])
        if payload.get("type") != "access":
            return None
        return await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
    except jwt.PyJWTError:
        return None


async def _user_from_session(token: str):
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        return None
    exp = sess["expires_at"]
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        return None
    return await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})


async def resolve_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if token:
        u = await _user_from_jwt(token)
        if u:
            return u
    st = request.cookies.get("session_token")
    if st:
        u = await _user_from_session(st)
        if u:
            return u
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        b = header[7:]
        u = await _user_from_jwt(b) or await _user_from_session(b)
        if u:
            return u
    raise HTTPException(status_code=401, detail="Not authenticated")


async def get_current_user(request: Request) -> dict:
    return await resolve_user(request)


# ---------- brute force ----------
async def _check_lockout(identifier: str):
    rec = await db.login_attempts.find_one({"identifier": identifier})
    if not rec or rec.get("count", 0) < LOCKOUT_MAX:
        return
    locked_until = rec.get("locked_until")
    if not locked_until:
        return
    if isinstance(locked_until, str):
        locked_until = datetime.fromisoformat(locked_until)
    if locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)
    if locked_until > datetime.now(timezone.utc):
        raise HTTPException(status_code=429, detail="Too many attempts. Try again in a few minutes.")


async def _record_failure(identifier: str):
    rec = await db.login_attempts.find_one({"identifier": identifier})
    count = (rec.get("count", 0) if rec else 0) + 1
    update = {"count": count}
    if count >= LOCKOUT_MAX:
        update["locked_until"] = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MIN)
    await db.login_attempts.update_one({"identifier": identifier}, {"$set": update}, upsert=True)


async def _clear_failures(identifier: str):
    await db.login_attempts.delete_one({"identifier": identifier})


def _client_ip(request: Request) -> str:
    # Behind the k8s ingress, request.client.host is the proxy peer IP (varies per request).
    # The real client IP is the left-most entry of X-Forwarded-For.
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ---------- endpoints ----------
@router.post("/register")
async def register(body: RegisterRequest, response: Response):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "user_id": gen_id("user"), "email": email, "name": body.name.strip(),
        "picture": None, "role": "user", "auth_provider": "password",
        "password_hash": hash_password(body.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    access = create_access_token(user["user_id"], email)
    refresh = create_refresh_token(user["user_id"])
    _set_jwt_cookies(response, access, refresh)
    return {"user": _public(user), "access_token": access}


@router.post("/login")
async def login(body: LoginRequest, request: Request, response: Response):
    email = body.email.lower().strip()
    identifier = f"{_client_ip(request)}:{email}"
    await _check_lockout(identifier)
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(body.password, user["password_hash"]):
        await _record_failure(identifier)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await _clear_failures(identifier)
    access = create_access_token(user["user_id"], email)
    refresh = create_refresh_token(user["user_id"])
    _set_jwt_cookies(response, access, refresh)
    return {"user": _public(user), "access_token": access}


@router.post("/session")
async def google_session(body: SessionRequest, response: Response):
    """Exchange an Emergent OAuth session_id for a persistent session."""
    try:
        r = requests.get(EMERGENT_AUTH_URL, headers={"X-Session-ID": body.session_id}, timeout=20)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        logger.error(f"Emergent session exchange failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    email = (data.get("email") or "").lower().strip()
    if not email:
        raise HTTPException(status_code=401, detail="No email in session")

    existing = await db.users.find_one({"email": email})
    if existing:
        user = existing
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"name": data.get("name") or user.get("name"),
                      "picture": data.get("picture") or user.get("picture")}},
        )
    else:
        user = {
            "user_id": gen_id("user"), "email": email, "name": data.get("name", ""),
            "picture": data.get("picture"), "role": "user", "auth_provider": "google",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user)

    session_token = data.get("session_token") or secrets.token_urlsafe(48)
    await db.user_sessions.insert_one({
        "user_id": user["user_id"], "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS),
        "created_at": datetime.now(timezone.utc),
    })
    response.set_cookie("session_token", session_token, httponly=True, secure=True,
                        samesite="none", max_age=SESSION_DAYS * 86400, path="/")
    return {"user": _public(user), "session_token": session_token}


@router.post("/logout")
async def logout(request: Request, response: Response):
    st = request.cookies.get("session_token")
    if st:
        await db.user_sessions.delete_one({"session_token": st})
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    response.delete_cookie("session_token", path="/")
    return {"success": True}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return _public(user)


@router.post("/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGO])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    access = create_access_token(user["user_id"], user["email"])
    response.set_cookie("access_token", access, httponly=True, secure=True,
                        samesite="none", max_age=ACCESS_MIN * 60, path="/")
    return {"access_token": access}


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if user and user.get("auth_provider") == "password":
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": token, "user_id": user["user_id"], "used": False,
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
        })
        reset_link = f"{os.environ.get('FRONTEND_URL', '')}/reset-password?token={token}"
        logger.info(f"[PASSWORD RESET] {email} -> {reset_link}")
    return {"success": True, "message": "If that email exists, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest):
    rec = await db.password_reset_tokens.find_one({"token": body.token})
    if not rec or rec.get("used"):
        raise HTTPException(status_code=400, detail="Invalid or used reset token")
    exp = rec["expires_at"]
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token expired")
    await db.users.update_one({"user_id": rec["user_id"]},
                              {"$set": {"password_hash": hash_password(body.password)}})
    await db.password_reset_tokens.update_one({"token": body.token}, {"$set": {"used": True}})
    return {"success": True}


# ---------- seed ----------
async def seed_admin():
    email = os.environ.get("ADMIN_EMAIL", "admin@captioniq.app").lower()
    password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": email})
    if existing is None:
        await db.users.insert_one({
            "user_id": gen_id("user"), "email": email, "name": "Admin",
            "picture": None, "role": "admin", "auth_provider": "password",
            "password_hash": hash_password(password),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Admin seeded")
    elif not verify_password(password, existing.get("password_hash", "")):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(password)}})
        logger.info("Admin password updated")
