from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
)
from ..extensions import db
from ..models.user import User, UserRole
from ..schemas.user_schema import UserResponseSchema
from ..utils.api import api_error

auth_bp = Blueprint("auth_routes", __name__)


def _serialize(user: User) -> dict:
    return UserResponseSchema().dump(user)


# ── POST /auth/register ────────────────────────────────────────────────────────
@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}

    full_name      = (data.get("full_name") or "").strip()
    email          = (data.get("email") or "").strip().lower()
    password       = data.get("password") or ""
    default_phone  = (data.get("default_phone") or "").strip() or None
    default_address = (data.get("default_address") or "").strip() or None

    if not full_name or not email or not password or not default_phone:
        return api_error(
            "Missing required fields: full_name, email, password, default_phone", 400
        )

    if User.query.filter_by(email=email).first():
        return api_error("Email already exists", 409)

    user = User(
        full_name=full_name,
        email=email,
        default_phone=default_phone,
        default_address=default_address,
        role=UserRole.USER,
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User created", "user": _serialize(user)}), 201


# ── POST /auth/login ───────────────────────────────────────────────────────────
@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}

    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return api_error("Missing email or password", 400)

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return api_error("Invalid credentials", 401)

    access  = create_access_token(identity=str(user.id))
    refresh = create_refresh_token(identity=str(user.id))

    return jsonify({
        "access_token":  access,
        "refresh_token": refresh,
        "user": _serialize(user),
    }), 200


# ── POST /auth/refresh ─────────────────────────────────────────────────────────
@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    user_id = int(get_jwt_identity())
    access  = create_access_token(identity=str(user_id))
    return jsonify({"access_token": access}), 200


# ── GET /auth/me ───────────────────────────────────────────────────────────────
@auth_bp.get("/me")
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return api_error("User not found", 404)
    return jsonify(_serialize(user)), 200
