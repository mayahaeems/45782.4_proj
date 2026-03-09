from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from ..extensions import db
from ..models.user import User, UserRole
from ..models.order import Order, DeliveryStatus
from ..schemas.user_schema import (
    UserResponseSchema,
    AdminUserCreateSchema,
    UserUpdateSchema,
    AdminUserUpdateSchema,
)
from ..utils.api import api_error, get_current_user, require_admin

user_bp = Blueprint("users", __name__)


# ── helpers ────────────────────────────────────────────────────────────────────

def _serialize(user: User) -> dict:
    return UserResponseSchema().dump(user)


def _delivery_safe(user: User) -> dict:
    """Minimal customer info safe to show a delivery person: name + phone only."""
    return {
        "id":            user.id,
        "full_name":     user.full_name,
        "default_phone": user.default_phone,
    }


def _active_customer_orders(user_id: int) -> int:
    """Orders placed by this customer that are still in progress."""
    return Order.query.filter(
        Order.user_id == user_id,
        Order.delivery_status.notin_([DeliveryStatus.delivered, DeliveryStatus.canceled]),
    ).count()


def _active_assigned_orders(delivery_user_id: int) -> int:
    """Orders currently assigned to this delivery person."""
    return Order.query.filter(
        Order.delivery_user_id == delivery_user_id,
        Order.delivery_status.notin_([DeliveryStatus.delivered, DeliveryStatus.canceled]),
    ).count()


# ══════════════════════════════════════════════════════════════════════════════
#  SELF  (base — every authenticated role)
# ══════════════════════════════════════════════════════════════════════════════

@user_bp.get("/me")
@jwt_required()
def get_me():
    """All roles — own full profile."""
    user, err = get_current_user()
    if err:
        return err
    return jsonify(_serialize(user)), 200


@user_bp.put("/me")
@jwt_required()
def update_me():
    """
    All roles — edit own profile.
    Allowed: full_name, default_phone, default_address, password, profile_image_key.
    'role' is silently ignored — no self-promotion ever.
    """
    user, err = get_current_user()
    if err:
        return err

    data = request.get_json(silent=True) or {}
    data.pop("role", None)  # silently strip — no self-promotion

    try:
        validated = UserUpdateSchema().load(data, partial=True)
    except ValidationError as ve:
        return api_error("Validation error", 400, ve.messages)

    for key, value in validated.items():
        if key == "password":
            user.set_password(value)
        else:
            setattr(user, key, value)

    db.session.commit()
    return jsonify(_serialize(user)), 200


@user_bp.delete("/me")
@jwt_required()
def delete_me():
    """
    All roles — delete own account.

    Guards:
      USER     → blocked if any orders still in progress
      DELIVERY → blocked if any orders currently assigned to them
      ADMIN    → always blocked (use another admin or direct DB access)
    """
    user, err = get_current_user()
    if err:
        return err

    if user.role == UserRole.ADMIN:
        return api_error(
            "Admin accounts cannot be self-deleted. "
            "Ask another admin to remove this account.",
            403,
        )

    if user.role == UserRole.USER:
        n = _active_customer_orders(user.id)
        if n:
            return api_error(
                f"Cannot delete account — {n} order(s) still in progress. "
                "Wait for delivery or contact support.",
                400,
            )

    if user.role == UserRole.DELIVERY:
        n = _active_assigned_orders(user.id)
        if n:
            return api_error(
                f"Cannot delete account — {n} order(s) currently assigned to you. "
                "Ask an admin to reassign them first.",
                400,
            )

    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "Account deleted"}), 200


# ══════════════════════════════════════════════════════════════════════════════
#  DELIVERY+  (user perms plus this)
# ══════════════════════════════════════════════════════════════════════════════

@user_bp.get("/<int:user_id>")
@jwt_required()
def get_user(user_id):
    """
    ADMIN    → any user, full profile
    SELF     → own full profile (any role)
    DELIVERY → customer whose order is assigned to THIS delivery person only.
               Returns name + phone only (no email, role, address).
    USER     → 403 (use GET /users/me for self)
    """
    current_user, err = get_current_user()
    if err:
        return err

    # Self — always allowed, any role
    if current_user.id == user_id:
        return jsonify(_serialize(current_user)), 200

    target = User.query.get(user_id)
    if not target:
        return api_error("User not found", 404)

    # Admin — full access
    if current_user.role == UserRole.ADMIN:
        return jsonify(_serialize(target)), 200

    # Delivery — limited: only their own assigned customer, name+phone only
    if current_user.role == UserRole.DELIVERY:
        if target.role != UserRole.USER:
            return api_error("Access denied", 403)

        assigned = Order.query.filter_by(
            user_id=user_id,
            delivery_user_id=current_user.id,
        ).first()
        if not assigned:
            return api_error("Access denied", 403)

        return jsonify(_delivery_safe(target)), 200

    # Regular user — cannot view others
    return api_error("Access denied", 403)


# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN only
# ══════════════════════════════════════════════════════════════════════════════

@user_bp.get("/")
@jwt_required()
def list_users():
    """ADMIN only — full list of all users."""
    current_user, err = get_current_user()
    if err:
        return err
    if current_user.role != UserRole.ADMIN:
        return api_error("Access denied", 403)

    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify(UserResponseSchema(many=True).dump(users)), 200


@user_bp.post("/")
@jwt_required()
def create_user():
    """ADMIN only — create a user with any role."""
    current_user, err = get_current_user()
    if err:
        return err
    err = require_admin(current_user)
    if err:
        return err

    data = request.get_json(silent=True) or {}
    try:
        validated = AdminUserCreateSchema().load(data)
    except ValidationError as ve:
        return api_error("Validation error", 400, ve.messages)

    user = User(
        full_name=validated["full_name"],
        email=validated["email"].strip().lower(),
        role=UserRole(validated["role"]),
        default_phone=validated["default_phone"],
        default_address=validated.get("default_address"),
    )
    user.set_password(validated["password"])
    db.session.add(user)
    db.session.commit()
    return jsonify(_serialize(user)), 201


@user_bp.put("/<int:user_id>")
@jwt_required()
def update_user(user_id):
    """
    ADMIN only — update any user's profile or role.

    Role-change rules:
      user / delivery → any role   ✅
      admin → anything             ❌  (prevents accidental lockout)
      self via this endpoint       ❌  (use PUT /users/me instead)
    """
    current_user, err = get_current_user()
    if err:
        return err
    err = require_admin(current_user)
    if err:
        return err

    if current_user.id == user_id:
        return api_error(
            "Use PUT /users/me to update your own profile.", 400
        )

    target = User.query.get(user_id)
    if not target:
        return api_error("User not found", 404)

    data = request.get_json(silent=True) or {}
    try:
        validated = AdminUserUpdateSchema().load(data, partial=True)
    except ValidationError as ve:
        return api_error("Validation error", 400, ve.messages)

    # Block role change on admin accounts
    if "role" in validated and target.role == UserRole.ADMIN:
        return api_error(
            "Cannot change the role of an admin account. "
            "Direct database access is required to demote an admin.",
            403,
        )

    for key, value in validated.items():
        if key == "password":
            target.set_password(value)
        elif key == "role":
            target.role = UserRole(value)
        else:
            setattr(target, key, value)

    db.session.commit()
    return jsonify(_serialize(target)), 200


@user_bp.delete("/<int:user_id>")
@jwt_required()
def delete_user(user_id):
    """
    ADMIN only — delete any user.

    Guards:
      • Cannot delete self
      • Cannot delete another admin
      • Cannot delete customer with active in-progress orders
      • Cannot delete delivery person with active assigned orders
    """
    current_user, err = get_current_user()
    if err:
        return err
    err = require_admin(current_user)
    if err:
        return err

    if current_user.id == user_id:
        return api_error("Cannot delete your own account.", 400)

    target = User.query.get(user_id)
    if not target:
        return api_error("User not found", 404)

    if target.role == UserRole.ADMIN:
        return api_error(
            "Cannot delete another admin account. Demote them first.", 403
        )

    if target.role == UserRole.USER:
        n = _active_customer_orders(target.id)
        if n:
            return api_error(
                f"Cannot delete — this customer has {n} order(s) in progress. "
                "Cancel or complete them first.",
                400,
            )

    if target.role == UserRole.DELIVERY:
        n = _active_assigned_orders(target.id)
        if n:
            return api_error(
                f"Cannot delete — this delivery person has {n} active order(s) assigned. "
                "Reassign them first.",
                400,
            )

    db.session.delete(target)
    db.session.commit()
    return jsonify({"message": "User deleted"}), 200






