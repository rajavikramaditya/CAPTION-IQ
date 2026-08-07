"""
Custom Fonts API — upload and list custom TTF/OTF fonts per user.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pathlib import Path
import logging

from auth import get_current_user
from database import db
from storage import put_object, APP_NAME, gen_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/fonts", tags=["fonts"])

ALLOWED_EXTENSIONS = {".ttf", ".otf", ".woff", ".woff2"}


@router.get("")
async def list_fonts(user: dict = Depends(get_current_user)):
    """List custom uploaded fonts for current user."""
    fonts = await db.custom_fonts.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    return fonts


@router.post("")
async def upload_font(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload a custom .ttf/.otf font file."""
    ext = Path(file.filename or "font.ttf").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid font format '{ext}'. Allowed: .ttf, .otf, .woff, .woff2"
        )

    content = await file.read()
    if len(content) > 10 * 1024 * 1024: # 10MB limit
        raise HTTPException(status_code=400, detail="Font file exceeds 10MB limit")

    font_id = gen_id("font")
    clean_name = Path(file.filename).stem.replace(" ", "-")
    font_family = f"Custom-{clean_name}"
    storage_path = f"{APP_NAME}/fonts/{user['user_id']}/{font_id}{ext}"

    mime = "font/ttf" if ext == ".ttf" else "font/otf"
    put_result = put_object(storage_path, content, mime)

    record = {
        "font_id": font_id,
        "user_id": user["user_id"],
        "name": clean_name,
        "family": font_family,
        "storage_path": put_result["path"],
        "extension": ext,
    }
    await db.custom_fonts.insert_one(record)

    return {
        "font_id": font_id,
        "name": clean_name,
        "family": font_family,
        "storage_path": put_result["path"],
    }
