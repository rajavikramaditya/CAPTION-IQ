"""Pydantic models. The CaptionDocument is the FROZEN source-of-truth schema
that both the live preview and (future) render pipeline consume."""
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def gen_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


# ---------- Users / Auth ----------
class UserPublic(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "user"
    auth_provider: str = "password"
    created_at: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=200)
    name: str = Field(min_length=1, max_length=120)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SessionRequest(BaseModel):
    session_id: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(min_length=6, max_length=200)


# ---------- Caption Document (FROZEN v1 schema) ----------
class CaptionWord(BaseModel):
    id: str
    text: str
    start: float
    end: float
    entity_type: Optional[str] = None       # person | location | action | None
    confidence: Optional[float] = None
    speaker_id: Optional[str] = None        # speaker_a | speaker_b | None
    emphasis: bool = False


class CaptionSegment(BaseModel):
    id: str
    start: float
    end: float
    word_ids: List[str] = Field(default_factory=list)
    text: str = ""


class CaptionStyle(BaseModel):
    template_id: Optional[str] = None
    brand_kit_id: Optional[str] = None
    overrides: Dict[str, Any] = Field(default_factory=dict)


class CaptionDocument(BaseModel):
    version: int = 1
    language: Optional[str] = None
    source: Optional[str] = None            # whisper | manual
    words: List[CaptionWord] = Field(default_factory=list)
    segments: List[CaptionSegment] = Field(default_factory=list)
    style: CaptionStyle = Field(default_factory=CaptionStyle)
    word_count: int = 0
    duration: float = 0.0


# ---------- Media ----------
class MediaAsset(BaseModel):
    media_id: str
    project_id: str
    user_id: str
    storage_path: str
    original_filename: str
    content_type: str
    size: int
    duration: float = 0.0
    is_deleted: bool = False
    created_at: str


# ---------- Projects ----------
class Project(BaseModel):
    project_id: str
    user_id: str
    title: str
    status: str = "draft"                   # draft | transcribing | ready | failed
    media_id: Optional[str] = None
    caption_document: CaptionDocument = Field(default_factory=CaptionDocument)
    created_at: str
    updated_at: str


class ProjectSummary(BaseModel):
    project_id: str
    title: str
    status: str
    has_media: bool
    word_count: int
    duration: float
    created_at: str
    updated_at: str


class CreateProjectRequest(BaseModel):
    title: Optional[str] = None


class UpdateCaptionRequest(BaseModel):
    caption_document: CaptionDocument
