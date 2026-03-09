from marshmallow import fields, validate, validates_schema, ValidationError
from .base import BaseSchema
from ..models.order import DeliveryStatus
from ..models.user import User


# ── DELIVERY RESPONSE ──────────────────────────────────────────────────────────
class DeliveryResponseSchema(BaseSchema):
    order_id         = fields.Int(dump_only=True)
    delivery_user_id = fields.Int(dump_only=True, allow_none=True)
    delivery_status  = fields.Function(lambda obj: obj.delivery_status.value)
    updated_at       = fields.DateTime(dump_only=True)


# ── DELIVERY ASSIGN (ADMIN only) ───────────────────────────────────────────────
class DeliveryAssignSchema(BaseSchema):
    delivery_user_id = fields.Int(required=True)

    @validates_schema
    def validate_assignment(self, data, **kwargs):
        order         = self.context.get("order")
        delivery_user = self.context.get("delivery_user")

        if not order:
            raise ValidationError("Order context is required")
        if not delivery_user:
            raise ValidationError("Delivery user context is required")

        if order.delivery_status in {DeliveryStatus.delivered, DeliveryStatus.canceled}:
            raise ValidationError("Cannot assign delivery for a completed or canceled order")

        if not delivery_user.is_delivery():
            raise ValidationError("User is not a delivery personnel")


# ── DELIVERY STATUS UPDATE (DELIVERY ROLE) ────────────────────────────────────
class DeliveryStatusUpdateSchema(BaseSchema):
    delivery_status = fields.Str(
        required=True,
        validate=validate.OneOf([s.value for s in DeliveryStatus])
    )

    @validates_schema
    def validate_status_transition(self, data, **kwargs):
        order = self.context.get("order")
        if not order:
            raise ValidationError("Order context is required")

        current = order.delivery_status.value
        new     = data.get("delivery_status")

        allowed_transitions = {
            DeliveryStatus.pending.value:    {DeliveryStatus.processing.value, DeliveryStatus.canceled.value},
            DeliveryStatus.processing.value: {DeliveryStatus.assigned.value,   DeliveryStatus.canceled.value},
            DeliveryStatus.assigned.value:   {DeliveryStatus.on_the_way.value, DeliveryStatus.canceled.value},
            DeliveryStatus.on_the_way.value: {DeliveryStatus.delivered.value,  DeliveryStatus.canceled.value},
        }

        if current not in allowed_transitions:
            raise ValidationError(f"Cannot change status from: {current}")
        if new not in allowed_transitions[current]:
            raise ValidationError(f"Invalid transition: {current} → {new}")
