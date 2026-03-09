import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    # ── Core ───────────────────────────────────────────────────────────────────
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")

    # ── Database ───────────────────────────────────────────────────────────────
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "SQLALCHEMY_DATABASE_URI",
        "sqlite:///app.db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,   # auto-reconnect on stale connections
        "pool_recycle":  300,    # recycle connections every 5 min (important for MySQL)
    }

    # ── JWT ────────────────────────────────────────────────────────────────────
    JWT_SECRET_KEY            = os.getenv("JWT_SECRET_KEY", "jwt-dev-secret-change-in-production")
    JWT_ACCESS_TOKEN_EXPIRES  = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)   # was 1 day — too short for mobile
    JWT_TOKEN_LOCATION        = ["headers"]
    JWT_HEADER_NAME           = "Authorization"
    JWT_HEADER_TYPE           = "Bearer"

    # ── Uploads ────────────────────────────────────────────────────────────────
    BASE_DIR      = os.path.abspath(os.path.dirname(__file__))  # always relative to config.py, not cwd
    UPLOAD_FOLDER = os.getenv(
        "UPLOAD_FOLDER",
        os.path.join(BASE_DIR, "instance", "uploads")
    )
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024   # 10 MB max upload

    # ── CORS ───────────────────────────────────────────────────────────────────
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")