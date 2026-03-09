from flask import jsonify, Blueprint
from flask_jwt_extended import get_jwt_identity
from ..models.user import User, UserRole

api_bp = Blueprint("api", __name__)


# ── HEALTH CHECK ───────────────────────────────────────────────────────────────
@api_bp.get("/health")
def health():
    return jsonify({"ok": True}), 200


# ── ERROR HELPER ───────────────────────────────────────────────────────────────
def api_error(message: str, code: int = 400, extra=None):
    """Standard error response: {error: message, details: extra}"""
    payload = {"error": message}
    if extra is not None:
        payload["details"] = extra
    return jsonify(payload), code


# ── AUTH HELPERS ───────────────────────────────────────────────────────────────
def get_current_user():
    """
    Decode JWT and return (user, None) or (None, error_response).
    Always use this instead of get_jwt_identity() directly in routes.
    """
    user_id = get_jwt_identity()
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return None, api_error("Invalid token identity", 401)

    user = User.query.get(user_id)
    if not user:
        return None, api_error("User not found", 404)

    return user, None


# ── PERMISSION GUARDS ──────────────────────────────────────────────────────────
def require_admin(user: User):
    """Returns error response if user is not ADMIN, else None."""
    if user.role != UserRole.ADMIN:
        return api_error("Admin privileges required", 403)
    return None


def require_delivery(user: User):
    """Returns error response if user is not DELIVERY, else None."""
    if user.role != UserRole.DELIVERY:
        return api_error("Delivery privileges required", 403)
    return None


def require_admin_or_delivery(user: User):
    """Returns error response if user is neither ADMIN nor DELIVERY, else None."""
    if user.role not in (UserRole.ADMIN, UserRole.DELIVERY):
        return api_error("Admin or delivery privileges required", 403)
    return None


def require_owner_or_admin(user: User, owner_id: int):
    """
    Returns error response if user is not the owner of the resource
    AND is not an admin. Use for endpoints where users can access
    their own data but admins can access everything.
    """
    if user.role != UserRole.ADMIN and user.id != owner_id:
        return api_error("Access denied", 403)
    return None
