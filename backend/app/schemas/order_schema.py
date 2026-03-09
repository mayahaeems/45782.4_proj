from marshmallow import fields, validate, validates_schema, ValidationError
from .base import BaseSchema
from ..models.cart import CartStatus
from ..models.product import Product
from ..models.order import OrderPaymentStatus, DeliveryStatus, PaymentProvider, PaymentStatus


# ── SAFE USER INFO (for delivery — no email, no role) ─────────────────────────
class UserDeliverySchema(BaseSchema):
    id            = fields.Int(dump_only=True)
    full_name     = fields.Str(dump_only=True)
    default_phone = fields.Str(dump_only=True)


# ── PRODUCT MINI (nested inside order item — name + image for order history) ───
class OrderItemProductSchema(BaseSchema):
    id           = fields.Int(dump_only=True)
    name         = fields.Str(dump_only=True)
    price_amount = fields.Int(dump_only=True)
    main_image   = fields.Method("get_main_image", dump_only=True)

    def get_main_image(self, obj):
        if obj.main_image:
            return {
                "id":          obj.main_image.id,
                "storage_key": obj.main_image.storage_key,
                "url":         f"/files/{obj.main_image.storage_key}",
            }
        return None


# ── ORDER ITEM RESPONSE ────────────────────────────────────────────────────────
class OrderItemResponseSchema(BaseSchema):
    id          = fields.Int(dump_only=True)
    product_id  = fields.Int(dump_only=True)
    unit_amount = fields.Int(dump_only=True)
    quantity    = fields.Int(dump_only=True)
    line_total  = fields.Method("get_line_total", dump_only=True)
    product     = fields.Nested(OrderItemProductSchema, dump_only=True)   # ← ADDED

    def get_line_total(self, obj):
        return obj.unit_amount * obj.quantity


# ── PAYMENT RESPONSE (nested inside order) ────────────────────────────────────
class PaymentResponseSchema(BaseSchema):
    id                  = fields.Int(dump_only=True)
    provider            = fields.Function(lambda obj: obj.provider.value)
    status              = fields.Function(lambda obj: obj.status.value)
    currency            = fields.Str(dump_only=True)
    amount              = fields.Int(dump_only=True)
    provider_payment_id = fields.Str(dump_only=True, allow_none=True)
    created_at          = fields.DateTime(dump_only=True)


# ── FULL ORDER RESPONSE ────────────────────────────────────────────────────────
class OrderResponseSchema(BaseSchema):
    id               = fields.Int(dump_only=True)
    user_id          = fields.Int(dump_only=True)
    user             = fields.Nested(UserDeliverySchema, dump_only=True)
    delivery_user_id = fields.Int(dump_only=True, allow_none=True)
    delivery_user    = fields.Nested(UserDeliverySchema, dump_only=True, allow_none=True)
    currency         = fields.Str(dump_only=True)
    subtotal_amount  = fields.Int(dump_only=True)
    shipping_amount  = fields.Int(dump_only=True)
    discount_amount  = fields.Int(dump_only=True)
    tax_amount       = fields.Int(dump_only=True)
    total_amount     = fields.Int(dump_only=True)
    payment_status   = fields.Function(lambda obj: obj.payment_status.value)
    delivery_status  = fields.Function(lambda obj: obj.delivery_status.value)
    address          = fields.Str(dump_only=True)
    phone_number     = fields.Str(dump_only=True)
    items            = fields.List(fields.Nested(OrderItemResponseSchema), dump_only=True)
    payments         = fields.List(fields.Nested(PaymentResponseSchema), dump_only=True)
    created_at       = fields.DateTime(dump_only=True)
    updated_at       = fields.DateTime(dump_only=True)


# ── ORDER CHECKOUT (USER) ──────────────────────────────────────────────────────
class OrderCreateSchema(BaseSchema):
    payment_provider = fields.Str(
        required=True,
        validate=validate.OneOf([p.value for p in PaymentProvider])
    )
    address      = fields.Str(required=True, validate=validate.Length(min=5, max=255))
    phone_number = fields.Str(required=True, validate=validate.Length(min=7, max=50))

    @validates_schema
    def validate_cart_and_inventory(self, data, **kwargs):
        cart = self.context.get("cart")
        if not cart:
            raise ValidationError("Cart context is required")
        if cart.status != CartStatus.active:
            raise ValidationError("Cart is not active")
        if not cart.items:
            raise ValidationError("Cart is empty")

        errors = {}
        for item in cart.items:
            product = Product.query.get(item.product_id)
            if not product:
                errors[item.product_id] = "Product no longer exists"
                continue
            if not product.is_active:
                errors[item.product_id] = "Product is inactive"
                continue
            if product.price_amount != item.unit_amount:
                errors[item.product_id] = "Product price has changed — please review your cart"
                continue
            if product.quantity < item.quantity:
                errors[item.product_id] = "Insufficient stock"

        if errors:
            raise ValidationError({"cart_items": errors})


# ── ADMIN ORDER UPDATE ─────────────────────────────────────────────────────────
class AdminOrderUpdateSchema(BaseSchema):
    payment_status  = fields.Str(validate=validate.OneOf([s.value for s in OrderPaymentStatus]))
    delivery_status = fields.Str(validate=validate.OneOf([s.value for s in DeliveryStatus]))

    @validates_schema
    def validate_not_empty(self, data, **kwargs):
        if not data:
            raise ValidationError("At least one field must be provided")


# ── DELIVERY STATUS UPDATE (DELIVERY ROLE ONLY) ────────────────────────────────
class DeliveryOrderUpdateSchema(BaseSchema):
    delivery_status = fields.Str(
        required=True,
        validate=validate.OneOf([
            DeliveryStatus.assigned.value,
            DeliveryStatus.on_the_way.value,
            DeliveryStatus.delivered.value,
        ])
    )

    @validates_schema
    def validate_delivery_transition(self, data, **kwargs):
        order = self.context.get("order")
        if not order:
            raise ValidationError("Order context is required")

        current = order.delivery_status.value
        new     = data.get("delivery_status")

        allowed_transitions = {
            DeliveryStatus.assigned.value:   {DeliveryStatus.on_the_way.value},
            DeliveryStatus.on_the_way.value: {DeliveryStatus.delivered.value},
        }

        if current not in allowed_transitions:
            raise ValidationError(f"Order cannot be updated at this stage: {current}")
        if new not in allowed_transitions[current]:
            raise ValidationError(f"Invalid transition: {current} → {new}")