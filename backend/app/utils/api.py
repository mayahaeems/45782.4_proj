from flask import jsonify
from flask_jwt_extended import get_jwt_identity
from ..models.user import User, UserRole
from flask import Blueprint

api_bp = Blueprint("api", __name__)

@api_bp.get("/health")
def health():
    return {"ok": True}
def api_error(message: str, code: int = 400, extra=None):
    payload = {"error": message}
    if extra is not None:
        payload["details"] = extra
    return jsonify(payload), code

def get_current_user():
    user_id = get_jwt_identity()
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return None, api_error("Invalid token identity", 401)
    user = User.query.get(user_id)
    if not user:
        return None, api_error("User not found", 404)
    return user, None

def require_admin(user):
    if user.role != UserRole.ADMIN:
        return api_error("Admin privileges required", 403)
    return None

def require_delivery(user):
    if user.role != UserRole.DELIVERY:
        return api_error("Delivery privileges required", 403)
    return None
