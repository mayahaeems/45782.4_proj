from urllib.parse import urlparse
from sqlalchemy import create_engine, text
from flask import Flask
from flask_cors import CORS
import os

from .extensions import db, jwt

def ensure_database_exists(database_url: str) -> None:
    if not database_url.startswith("mysql"):
        return

    parsed  = urlparse(database_url)
    db_name = parsed.path.lstrip("/").split("?")[0]
    if not db_name:
        return

    server_url = database_url.replace(f"/{db_name}", "/", 1)
    engine = create_engine(server_url, pool_pre_ping=True)
    with engine.connect() as conn:
        conn.execute(text(
            f"CREATE DATABASE IF NOT EXISTS `{db_name}` "
            "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
        ))
        conn.commit()
    engine.dispose()


def create_app():
    app = Flask(__name__)
    app.url_map.strict_slashes = False

    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("SQLALCHEMY_DATABASE_URI")
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "change-me")
    app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "change-jwt")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["UPLOAD_FOLDER"] = os.environ.get("UPLOAD_FOLDER", "/app/instance/uploads")

    ensure_database_exists(app.config["SQLALCHEMY_DATABASE_URI"])

    db.init_app(app)
    jwt.init_app(app)
    CORS(app, origins=os.environ.get("CORS_ORIGINS", "*"))

    from .routes import register_blueprints
    register_blueprints(app)

    with app.app_context():
        from . import models
        db.create_all()
        from .seed import seed_db
        seed_db()

    return app