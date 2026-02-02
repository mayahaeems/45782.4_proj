from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity
)
from ..extensions import db
from ..models.user import User, UserRole
from ..schemas.user_schema import UserResponseSchema
from ..utils.api import api_error  # use shared helper

auth_bp = Blueprint("auth_routes", __name__)
def _normalize_str(value):
    return (value or "").strip()

def _serialize(user: User) -> dict:
    """Serialize user data excluding password_hash"""
    return UserResponseSchema().dump(user)

# --- Register (public, role=USER) ---
@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    full_name = _normalize_str(data.get("full_name"))
    email = _normalize_str(data.get("email")).lower()
    password = data.get("password") or ""
    default_phone = _normalize_str(data.get("default_phone")) or None
    default_address = _normalize_str(data.get("default_address")) or None

    if not full_name or not email or not password or not default_phone:
        return api_error(
            "Missing required fields: full_name, email, password, default_phone",
            400
        )
    if User.query.filter_by(email=email).first():
        return api_error("Email already exists", 409)

    user = User(
        full_name=full_name,
        email=email,
        default_phone=default_phone,
        default_address=default_address,
        role=UserRole.USER
    )
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    return jsonify({
        "message": "User created",
        "user": _serialize(user)
    }), 201
# --- Login ---
@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}

    email = _normalize_str(data.get("email")).lower()
    password = data.get("password") or ""

    if not email or not password:
        return api_error("Missing email or password", 400)

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return api_error("Invalid credentials", 401)

    access = create_access_token(identity=str(user.id))
    refresh = create_refresh_token(identity=str(user.id))

    # Returning user object helps your React app immediately know role/name
    return jsonify({
        "access_token": access,
        "refresh_token": refresh,
        "user": _serialize(user),
    }), 200

# --- Refresh token ---
@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    user_id = int(get_jwt_identity())
    access = create_access_token(identity=str(user_id))
    return jsonify({"access_token": access}), 200
# --- Get own profile ---
@auth_bp.get("/me")
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return api_error("User not found", 404)
    return jsonify(_serialize(user)), 200
