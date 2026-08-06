from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging

from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware

from database import client, ensure_indexes
from auth import router as auth_router, seed_admin
from projects import router as projects_router
from storage import init_storage

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="CaptionIQ API")

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "CaptionIQ API"}


api_router.include_router(auth_router)
api_router.include_router(projects_router)
app.include_router(api_router)

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await ensure_indexes()
    await seed_admin()
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed (will retry lazily): {e}")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
