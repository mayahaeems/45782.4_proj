from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from ..extensions import db
from ..utils.api import api_error, get_current_user, require_delivery
from ..models.order import Order, DeliveryStatus
from ..schemas.order_schema import OrderResponseSchema, DeliveryOrderUpdateSchema

delivery_bp = Blueprint("delivery", __name__)


@delivery_bp.get("/orders")
@jwt_required()
def list_orders_for_delivery():
    user, err = get_current_user()
    if err:
        return err
    err = require_delivery(user)
    if err:
        return err

    orders = Order.query.filter(
        Order.delivery_status.notin_([DeliveryStatus.canceled, DeliveryStatus.delivered])
    ).all()

    return jsonify(OrderResponseSchema(many=True).dump(orders)), 200


@delivery_bp.put("/orders/<int:order_id>/status")
@jwt_required()
def update_delivery_status(order_id):
    user, err = get_current_user()
    if err:
        return err
    err = require_delivery(user)
    if err:
        return err

    order = Order.query.get(order_id)
    if not order:
        return api_error("Order not found", 404)

    data = request.get_json(silent=True) or {}
    schema = DeliveryOrderUpdateSchema()
    schema.context={"order": order}
    try:
        validated = schema.load(data)
    except ValidationError as ve:
        return api_error("Validation error", 400, ve.messages)

    order.delivery_status = DeliveryStatus(validated["delivery_status"])
    db.session.commit()
    return jsonify(OrderResponseSchema().dump(order)), 200
