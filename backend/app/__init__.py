from flask import Flask
from flask_cors import CORS

from app.extensions import db, jwt
from config import Config
from app.routes import register_blueprints
from app.seed import seed_db
from app.db_bootstrap import ensure_database_exists


def create_app():
    app = Flask(__name__)
    register_blueprints(app)
    app.config.from_object(Config)
    CORS(app)

    # Create DB if missing (MySQL only)
    ensure_database_exists(app.config["SQLALCHEMY_DATABASE_URI"])

    db.init_app(app)
    jwt.init_app(app)

    register_blueprints(app)

    with app.app_context():
        db.create_all()
        seed_db()

    return app
