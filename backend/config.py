import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    # --- Core ---
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")

    # Database:
    # use env var if exists, else fallback to local sqlite
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "SQLALCHEMY_DATABASE_URI",
        "sqlite:///app.db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # --- JWT ---
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-dev-secret")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=1)

    # --- Uploads ---
    BASE_DIR = os.path.abspath(os.getcwd())
    UPLOAD_FOLDER = os.getenv(
        "UPLOAD_FOLDER",
        os.path.join(BASE_DIR, "instance", "uploads")
    )

    # Limit upload size (10MB)
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024
