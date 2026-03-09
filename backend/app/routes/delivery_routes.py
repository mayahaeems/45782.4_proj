from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from ..extensions import db
from ..utils.api import api_error, get_current_user, require_admin
from ..models.order import Order, DeliveryStatus
from ..models.user import User, UserRole
from ..schemas.order_schema import OrderResponseSchema, DeliveryOrderUpdateSchema

delivery_bp = Blueprint("delivery", __name__)

_ACTIVE_STATUSES    = [DeliveryStatus.assigned, DeliveryStatus.on_the_way]
_COMPLETED_STATUSES = [DeliveryStatus.delivered, DeliveryStatus.canceled]


# ── GET /delivery/orders ───────────────────────────────────────────────────────
@delivery_bp.get("/orders")
@jwt_required()
def list_orders_for_delivery():
    """
    DELIVERY:
      default          → active orders assigned to THIS person (assigned/on_the_way)
      ?history=true    → completed orders (delivered/canceled) for THIS person

    ADMIN:
      default          → all active orders
      ?history=true    → all completed orders
    """
    user, err = get_current_user()
    if err:
        return err

    history = request.args.get("history", "false").lower() == "true"
    statuses = _COMPLETED_STATUSES if history else _ACTIVE_STATUSES

    if user.role == UserRole.ADMIN:
        orders = (
            Order.query
            .filter(Order.delivery_status.in_(statuses))
            .order_by(Order.created_at.desc())
            .all()
        )

    elif user.role == UserRole.DELIVERY:
        orders = (
            Order.query
            .filter(
                Order.delivery_user_id == user.id,
                Order.delivery_status.in_(statuses),
            )
            .order_by(Order.created_at.desc())
            .all()
        )

    else:
        return api_error("Access denied", 403)

    return jsonify(OrderResponseSchema(many=True).dump(orders)), 200


# ── GET /delivery/orders/<id> ──────────────────────────────────────────────────
@delivery_bp.get("/orders/<int:order_id>")
@jwt_required()
def get_delivery_order(order_id):
    """
    DELIVERY → detail for ONE order, ONLY if assigned to this person.
    ADMIN    → any order.
    """
    user, err = get_current_user()
    if err:
        return err

    if user.role not in (UserRole.ADMIN, UserRole.DELIVERY):
        return api_error("Access denied", 403)

    order = Order.query.get(order_id)
    if not order:
        return api_error("Order not found", 404)

    if user.role == UserRole.DELIVERY and order.delivery_user_id != user.id:
        return api_error("Access denied", 403)

    return jsonify(OrderResponseSchema().dump(order)), 200


# ── PUT /delivery/orders/<id>/status ──────────────────────────────────────────
@delivery_bp.put("/orders/<int:order_id>/status")
@jwt_required()
def update_delivery_status(order_id):
    """
    DELIVERY → strict transitions (assigned→on_the_way→delivered)
               ONLY on orders assigned to this person.
    ADMIN    → free status override on any order.
    """
    user, err = get_current_user()
    if err:
        return err

    if user.role not in (UserRole.ADMIN, UserRole.DELIVERY):
        return api_error("Access denied", 403)

    order = Order.query.get(order_id)
    if not order:
        return api_error("Order not found", 404)

    if user.role == UserRole.DELIVERY and order.delivery_user_id != user.id:
        return api_error("Access denied", 403)

    data = request.get_json(silent=True) or {}

    if user.role == UserRole.DELIVERY:
        schema = DeliveryOrderUpdateSchema()
        schema.context = {"order": order}
        try:
            validated = schema.load(data)
        except ValidationError as ve:
            return api_error("Validation error", 400, ve.messages)
    else:
        new_status = (data.get("delivery_status") or "").strip()
        if not new_status:
            return api_error("delivery_status is required", 400)
        try:
            validated = {"delivery_status": DeliveryStatus(new_status).value}
        except ValueError:
            return api_error(
                f"Invalid delivery_status. Valid: {[s.value for s in DeliveryStatus]}", 400
            )

    order.delivery_status = DeliveryStatus(validated["delivery_status"])
    db.session.commit()
    return jsonify(OrderResponseSchema().dump(order)), 200


# ── POST /delivery/orders/<id>/assign ─────────────────────────────────────────
@delivery_bp.post("/orders/<int:order_id>/assign")
@jwt_required()
def assign_delivery(order_id):
    """ADMIN only — assign a delivery person to an order."""
    user, err = get_current_user()
    if err:
        return err
    err = require_admin(user)
    if err:
        return err

    order = Order.query.get(order_id)
    if not order:
        return api_error("Order not found", 404)

    if order.delivery_status in (DeliveryStatus.delivered, DeliveryStatus.canceled):
        return api_error("Cannot assign a completed or canceled order.", 400)

    data = request.get_json(silent=True) or {}
    delivery_user_id = data.get("delivery_user_id")
    if not delivery_user_id:
        return api_error("delivery_user_id is required", 400)

    delivery_person = User.query.get(delivery_user_id)
    if not delivery_person:
        return api_error("Delivery user not found", 404)
    if not delivery_person.is_delivery():
        return api_error("User is not a delivery person.", 400)

    order.delivery_status = DeliveryStatus.assigned
    order.delivery_user_id = delivery_person.id
    db.session.commit()
    return jsonify(OrderResponseSchema().dump(order)), 200






