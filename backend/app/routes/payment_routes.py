from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from ..extensions import db
from ..utils.api import api_error, get_current_user, require_admin
from ..models.order import Order, Payment, PaymentProvider, PaymentStatus, OrderPaymentStatus
from ..models.user import UserRole
from ..schemas.payment_schema import PaymentResponseSchema, PaymentCreateSchema, PaymentUpdateSchema, PaymentRefundSchema

payment_bp = Blueprint("payments", __name__)


@payment_bp.get("/")
@jwt_required()
def list_payments():
    user, err = get_current_user()
    if err:
        return err
    err = require_admin(user)
    if err:
        return err

    payments = Payment.query.all()
    return jsonify(PaymentResponseSchema(many=True).dump(payments)), 200


@payment_bp.get("/<int:payment_id>")
@jwt_required()
def get_payment(payment_id):
    user, err = get_current_user()
    if err:
        return err

    payment = Payment.query.get(payment_id)
    if not payment:
        return api_error("Payment not found", 404)

    if user.role != UserRole.ADMIN and payment.order.user_id != user.id:
        return api_error("Access denied", 403)

    return jsonify(PaymentResponseSchema().dump(payment)), 200


@payment_bp.post("/orders/<int:order_id>")
@jwt_required()
def create_payment(order_id):
    user, err = get_current_user()
    if err:
        return err

    order = Order.query.get(order_id)
    if not order:
        return api_error("Order not found", 404)

    if user.role != UserRole.ADMIN and order.user_id != user.id:
        return api_error("Access denied", 403)

    data = request.get_json(silent=True) or {}
    schema = PaymentCreateSchema(context={"order": order})
    try:
        validated = schema.load(data)
    except ValidationError as ve:
        return api_error("Validation error", 400, ve.messages)

    payment = Payment(
        order_id=order.id,
        provider=PaymentProvider(validated["provider"]),
        status=PaymentStatus.created,
        currency=order.currency,
        amount=order.total_amount,   # IMPORTANT: server decides amount
    )

    db.session.add(payment)
    db.session.commit()
    return jsonify(PaymentResponseSchema().dump(payment)), 201


@payment_bp.put("/<int:payment_id>")
@jwt_required()
def update_payment(payment_id):
    """
    Use this for provider callbacks / admin simulation.
    Enforces valid transitions via PaymentUpdateSchema.
    """
    user, err = get_current_user()
    if err:
        return err
    err = require_admin(user)
    if err:
        return err

    payment = Payment.query.get(payment_id)
    if not payment:
        return api_error("Payment not found", 404)

    data = request.get_json(silent=True) or {}
    schema = PaymentUpdateSchema(context={"payment": payment})
    try:
        validated = schema.load(data)
    except ValidationError as ve:
        return api_error("Validation error", 400, ve.messages)

    payment.status = PaymentStatus(validated["status"])
    payment.provider_payment_id = validated.get("provider_payment_id")

    # if captured => mark order paid
    if payment.status == PaymentStatus.captured:
        payment.order.payment_status = OrderPaymentStatus.paid

    db.session.commit()
    return jsonify(PaymentResponseSchema().dump(payment)), 200


@payment_bp.post("/<int:payment_id>/refund")
@jwt_required()
def refund_payment(payment_id):
    user, err = get_current_user()
    if err:
        return err
    err = require_admin(user)
    if err:
        return err

    payment = Payment.query.get(payment_id)
    if not payment:
        return api_error("Payment not found", 404)

    data = request.get_json(silent=True) or {}
    schema = PaymentRefundSchema(context={"payment": payment})
    try:
        schema.load(data)
    except ValidationError as ve:
        return api_error("Validation error", 400, ve.messages)

    payment.status = PaymentStatus.refunded
    payment.order.payment_status = OrderPaymentStatus.refunded

    db.session.commit()
    return jsonify(PaymentResponseSchema().dump(payment)), 200
