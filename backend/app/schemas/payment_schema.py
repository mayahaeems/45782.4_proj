from marshmallow import fields, validate, validates_schema, ValidationError
from .base import BaseSchema
from ..models.order import PaymentProvider, PaymentStatus, OrderPaymentStatus, Order


# ── PAYMENT RESPONSE ───────────────────────────────────────────────────────────
class PaymentResponseSchema(BaseSchema):
    id                  = fields.Int(dump_only=True)
    order_id            = fields.Int(dump_only=True)
    provider            = fields.Function(lambda obj: obj.provider.value)
    status              = fields.Function(lambda obj: obj.status.value)
    currency            = fields.Str(dump_only=True)
    amount              = fields.Int(dump_only=True)
    provider_payment_id = fields.Str(dump_only=True, allow_none=True)
    created_at          = fields.DateTime(dump_only=True)


# ── PAYMENT CREATE ─────────────────────────────────────────────────────────────
class PaymentCreateSchema(BaseSchema):
    provider = fields.Str(
        required=True,
        validate=validate.OneOf([p.value for p in PaymentProvider])
    )

    @validates_schema
    def validate_order_payment(self, data, **kwargs):
        order: Order | None = self.context.get("order")
        if not order:
            raise ValidationError("Order context is required")

        if order.payment_status in {
            OrderPaymentStatus.paid,
            OrderPaymentStatus.canceled,
            OrderPaymentStatus.refunded,
        }:
            raise ValidationError("Order cannot accept new payments")

        # only one active payment at a time
        active = next(
            (p for p in order.payments
             if p.status in {PaymentStatus.created, PaymentStatus.authorized}),
            None,
        )
        if active:
            raise ValidationError("An active payment already exists for this order")


# ── PAYMENT UPDATE (PSP callback / admin simulation) ──────────────────────────
class PaymentUpdateSchema(BaseSchema):
    status              = fields.Str(
        required=True,
        validate=validate.OneOf([s.value for s in PaymentStatus])
    )
    provider_payment_id = fields.Str(allow_none=True, validate=validate.Length(max=128))

    @validates_schema
    def validate_payment_transition(self, data, **kwargs):
        payment = self.context.get("payment")
        if not payment:
            raise ValidationError("Payment context is required")

        current = payment.status.value
        new     = data.get("status")

        allowed_transitions = {
            PaymentStatus.created.value: {
                PaymentStatus.authorized.value,
                PaymentStatus.failed.value,
                PaymentStatus.canceled.value,
            },
            PaymentStatus.authorized.value: {
                PaymentStatus.captured.value,
                PaymentStatus.canceled.value,
                PaymentStatus.refunded.value,
            },
            PaymentStatus.captured.value: {
                PaymentStatus.refunded.value,
            },
        }

        if current not in allowed_transitions:
            raise ValidationError(f"Payment cannot be updated from status: {current}")
        if new not in allowed_transitions[current]:
            raise ValidationError(f"Invalid payment transition: {current} → {new}")


# ── PAYMENT REFUND (ADMIN only) ────────────────────────────────────────────────
class PaymentRefundSchema(BaseSchema):
    reason = fields.Str(required=False, validate=validate.Length(max=255))

    @validates_schema
    def validate_refund(self, data, **kwargs):
        payment = self.context.get("payment")
        if not payment:
            raise ValidationError("Payment context is required")
        if payment.status != PaymentStatus.captured:
            raise ValidationError("Only captured payments can be refunded")
