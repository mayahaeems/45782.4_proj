from marshmallow import fields,validate,validates_schema,ValidationError
from .base import BaseSchema
from ..models.order import PaymentProvider,PaymentStatus,OrderPaymentStatus
from ..models.order import Order
# PAYMENT RESPONSE SCHEMA
class PaymentResponseSchema(BaseSchema):
    id = fields.Int(dump_only=True)
    order_id = fields.Int(dump_only=True)
    provider = fields.Function(lambda obj: obj.provider.value)
    status = fields.Function(lambda obj: obj.status.value)
    currency = fields.Str(dump_only=True)
    amount = fields.Int(dump_only=True)
    provider_payment_id = fields.Str(dump_only=True, allow_none=True)
    created_at = fields.DateTime(dump_only=True)
# PAYMENT CREATE SCHEMA (USER / SYSTEM)
class PaymentCreateSchema(BaseSchema):
    """
    Used when creating a payment attempt for an order
    (PayPal order creation / card authorization).
    """
    provider = fields.Str(required=True,validate=validate.OneOf([p.value for p in PaymentProvider]))
    @validates_schema
    def validate_order_payment(self, data, **kwargs):
        """
        HARD RULES:
        - Order context must exist
        - Order must belong to user (checked in route)
        - Order must not be paid / canceled
        - Only ONE active payment at a time
        """
        order: Order | None = self.context.get("order")
        if not order:
            raise ValidationError("Order context is required")
        if order.payment_status in {
            OrderPaymentStatus.paid,
            OrderPaymentStatus.canceled,
            OrderPaymentStatus.refunded,
        }:
            raise ValidationError("Order cannot accept payments")
        active_payment = next(
            (
                p for p in order.payments
                if p.status in {
                    PaymentStatus.created,
                    PaymentStatus.authorized,
                }
            ),
            None,
        )
        if active_payment:
            raise ValidationError(
                "An active payment already exists for this order"
            )
# PAYMENT PROVIDER CALLBACK / UPDATE SCHEMA
class PaymentUpdateSchema(BaseSchema):
    """
    Used internally after PSP callback / webhook
    """
    status = fields.Str(required=True,validate=validate.OneOf([s.value for s in PaymentStatus]),)
    provider_payment_id = fields.Str(allow_none=True,validate=validate.Length(max=128),)
    @validates_schema
    def validate_payment_transition(self, data, **kwargs):
        """
        Enforce valid payment status transitions
        """
        payment = self.context.get("payment")
        if not payment:
            raise ValidationError("Payment context is required")
        current = payment.status.value
        new = data["status"]
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
            raise ValidationError("Payment cannot be updated further")
        if new not in allowed_transitions[current]:
            raise ValidationError(
                f"Invalid payment status transition: {current} → {new}"
            )
# ADMIN PAYMENT REFUND SCHEMA
class PaymentRefundSchema(BaseSchema):
    """
    Explicit refund intent (ADMIN only)
    """
    reason = fields.Str(
        required=False,
        validate=validate.Length(max=255),
    )
    @validates_schema
    def validate_refund(self, data, **kwargs):
        payment = self.context.get("payment")
        if not payment:
            raise ValidationError("Payment context is required")
        if payment.status != PaymentStatus.captured:
            raise ValidationError("Only captured payments can be refunded")
