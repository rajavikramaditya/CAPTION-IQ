"""MongoDB connection + index/seed bootstrap."""
import os
import logging
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logger = logging.getLogger(__name__)

mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get("DB_NAME", "captioniq")]



async def ensure_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token")
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")
    await db.projects.create_index("project_id", unique=True)
    await db.projects.create_index("user_id")
    await db.media_assets.create_index("media_id", unique=True)
    await db.media_assets.create_index("project_id")
    await db.jobs.create_index("project_id")
    await db.usage_events.create_index("user_id")
    logger.info("Mongo indexes ensured")
