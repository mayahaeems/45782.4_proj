from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from ..extensions import db
from ..utils.api import api_error, get_current_user, require_admin
from ..models.cart import Cart, CartStatus
from ..models.product import Product
from ..models.order import (
    Order, OrderItem,
    OrderPaymentStatus, DeliveryStatus,
    Payment, PaymentProvider, PaymentStatus,
)
from ..models.user import UserRole
from ..schemas.order_schema import (
    OrderResponseSchema,
    OrderCreateSchema,
    AdminOrderUpdateSchema,
)

order_bp = Blueprint("orders", __name__)


@order_bp.get("/")
@jwt_required()
def list_orders():
    user, err = get_current_user()
    if err:
        return err

    if user.role == UserRole.ADMIN:
        orders = Order.query.all()
    else:
        orders = Order.query.filter_by(user_id=user.id).all()

    return jsonify(OrderResponseSchema(many=True).dump(orders)), 200


@order_bp.get("/<int:order_id>")
@jwt_required()
def get_order(order_id):
    user, err = get_current_user()
    if err:
        return err

    order = Order.query.get(order_id)
    if not order:
        return api_error("Order not found", 404)

    if user.role != UserRole.ADMIN and order.user_id != user.id:
        return api_error("Access denied", 403)

    return jsonify(OrderResponseSchema().dump(order)), 200


@order_bp.post("/checkout")
@jwt_required()
def checkout():
    user, err = get_current_user()
    if err:
        return err

    cart = Cart.get_or_create_active(user.id)

    data = request.get_json(silent=True) or {}
    schema = OrderCreateSchema()
    schema.context={"cart": cart}
    try:
        validated = schema.load(data)
    except ValidationError as ve:
        return api_error("Validation error", 400, ve.messages)

    order = Order(
        user_id=user.id,
        currency="ILS",
        address=validated["address"],
        phone_number=validated["phone_number"],
        payment_status=OrderPaymentStatus.pending,
        delivery_status=DeliveryStatus.pending,
    )

    # copy items from cart (snapshot prices)
    for ci in cart.items:
        order.items.append(OrderItem(
            product_id=ci.product_id,
            unit_amount=ci.unit_amount,
            quantity=ci.quantity,
        ))

    order.recalc_totals()

    # decrease stock
    for ci in cart.items:
        p = Product.query.get(ci.product_id)
        p.quantity -= ci.quantity

    # create a payment attempt (created)
    payment = Payment(
        order=order,
        provider=PaymentProvider(validated["payment_provider"]),
        status=PaymentStatus.created,
        currency=order.currency,
        amount=order.total_amount,
    )
    order.payments.append(payment)

    # close cart
    cart.status = CartStatus.converted

    db.session.add(order)
    db.session.commit()

    return jsonify(OrderResponseSchema().dump(order)), 201


@order_bp.put("/<int:order_id>")
@jwt_required()
def admin_update_order(order_id):
    user, err = get_current_user()
    if err:
        return err
    err = require_admin(user)
    if err:
        return err

    order = Order.query.get(order_id)
    if not order:
        return api_error("Order not found", 404)

    data = request.get_json(silent=True) or {}
    try:
        validated = AdminOrderUpdateSchema().load(data, partial=True)
    except ValidationError as ve:
        return api_error("Validation error", 400, ve.messages)

    if "payment_status" in validated:
        order.payment_status = OrderPaymentStatus(validated["payment_status"])
    if "delivery_status" in validated:
        order.delivery_status = DeliveryStatus(validated["delivery_status"])

    db.session.commit()
    return jsonify(OrderResponseSchema().dump(order)), 200


@order_bp.post("/<int:order_id>/cancel")
@jwt_required()
def cancel_order(order_id):
    user, err = get_current_user()
    if err:
        return err

    order = Order.query.get(order_id)
    if not order:
        return api_error("Order not found", 404)

    success, message = order.cancel(user)
    if not success:
        return api_error(message, 400)

    db.session.commit()
    return jsonify({"message": message}), 200
