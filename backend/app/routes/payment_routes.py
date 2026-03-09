from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from ..extensions import db
from ..utils.api import api_error, get_current_user, require_admin
from ..models.order import Order, Payment, PaymentProvider, PaymentStatus, OrderPaymentStatus
from ..models.user import UserRole
from ..schemas.payment_schema import (
    PaymentResponseSchema,
    PaymentCreateSchema,
    PaymentUpdateSchema,
    PaymentRefundSchema,
)

payment_bp = Blueprint("payments", __name__)


# ── GET /payments ──────────────────────────────────────────────────────────────
# ADMIN only — list all payments, optional filter by order
@payment_bp.get("/")
@jwt_required()
def list_payments():
    user, err = get_current_user()
    if err:
        return err
    err = require_admin(user)
    if err:
        return err

    order_id = request.args.get("order_id")
    q = Payment.query

    if order_id:
        try:
            q = q.filter_by(order_id=int(order_id))
        except ValueError:
            return api_error("order_id must be an integer", 400)

    payments = q.order_by(Payment.created_at.desc()).all()
    return jsonify(PaymentResponseSchema(many=True).dump(payments)), 200


# ── GET /payments/<id> ─────────────────────────────────────────────────────────
# ADMIN: any payment
# USER:  only their own order's payment
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


# ── POST /payments/orders/<order_id> ──────────────────────────────────────────
# USER (own order) + ADMIN: create a new payment attempt for an order
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
        amount=order.total_amount,  # server always decides the amount
    )
    db.session.add(payment)
    db.session.commit()

    return jsonify(PaymentResponseSchema().dump(payment)), 201


# ── PUT /payments/<id> ─────────────────────────────────────────────────────────
# ADMIN only — update payment status (PSP callback / manual simulation)
# Enforces valid transitions via PaymentUpdateSchema
@payment_bp.put("/<int:payment_id>")
@jwt_required()
def update_payment(payment_id):
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

    if "provider_payment_id" in validated:
        payment.provider_payment_id = validated["provider_payment_id"]

    # captured → mark order as paid
    if payment.status == PaymentStatus.captured:
        payment.order.payment_status = OrderPaymentStatus.paid

    # canceled → mark order as canceled if no other active payments
    elif payment.status == PaymentStatus.canceled:
        active = any(
            p.status in (PaymentStatus.created, PaymentStatus.authorized)
            for p in payment.order.payments
            if p.id != payment.id
        )
        if not active:
            payment.order.payment_status = OrderPaymentStatus.canceled

    db.session.commit()
    return jsonify(PaymentResponseSchema().dump(payment)), 200


# ── POST /payments/<id>/refund ─────────────────────────────────────────────────
# ADMIN only — refund a captured payment
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


# ── DELETE /payments/<id> ──────────────────────────────────────────────────────
# ADMIN only — delete a payment record (only if still in 'created' status)
@payment_bp.delete("/<int:payment_id>")
@jwt_required()
def delete_payment(payment_id):
    user, err = get_current_user()
    if err:
        return err
    err = require_admin(user)
    if err:
        return err

    payment = Payment.query.get(payment_id)
    if not payment:
        return api_error("Payment not found", 404)

    if payment.status != PaymentStatus.created:
        return api_error(
            "Only payments in 'created' status can be deleted", 400
        )

    db.session.delete(payment)
    db.session.commit()
    return jsonify({"message": "Payment deleted"}), 200
