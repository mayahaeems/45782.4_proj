from marshmallow import fields,validate,validates_schema,ValidationError
from .base import BaseSchema
from ..models.cart import CartStatus
from ..models.product import Product
from ..models.order import OrderPaymentStatus,DeliveryStatus,PaymentProvider,PaymentStatus
# ORDER ITEM RESPONSE
class OrderItemResponseSchema(BaseSchema):
    id = fields.Int(dump_only=True)
    product_id = fields.Int(dump_only=True)
    unit_amount = fields.Int(dump_only=True)
    quantity = fields.Int(dump_only=True)
    line_total = fields.Method("get_line_total", dump_only=True)
    def get_line_total(self, obj):
        return obj.unit_amount * obj.quantity
# PAYMENT RESPONSE
class PaymentResponseSchema(BaseSchema):
    id = fields.Int(dump_only=True)
    provider = fields.Function(lambda obj: obj.provider.value)
    status = fields.Function(lambda obj: obj.status.value)
    currency = fields.Str(dump_only=True)
    amount = fields.Int(dump_only=True)
    provider_payment_id = fields.Str(dump_only=True, allow_none=True)
    created_at = fields.DateTime(dump_only=True)
# ORDER RESPONSE (USER / ADMIN / DELIVERY)
class OrderResponseSchema(BaseSchema):
    id = fields.Int(dump_only=True)
    user_id = fields.Int(dump_only=True)
    currency = fields.Str(dump_only=True)
    subtotal_amount = fields.Int(dump_only=True)
    shipping_amount = fields.Int(dump_only=True)
    discount_amount = fields.Int(dump_only=True)
    tax_amount = fields.Int(dump_only=True)
    total_amount = fields.Int(dump_only=True)
    payment_status = fields.Function(lambda obj: obj.payment_status.value)
    delivery_status = fields.Function(lambda obj: obj.delivery_status.value)
    address = fields.Str(dump_only=True)
    phone_number = fields.Str(dump_only=True)
    items = fields.List(fields.Nested(OrderItemResponseSchema),dump_only=True,)
    payments = fields.List(fields.Nested(PaymentResponseSchema),dump_only=True,)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
# ORDER CREATE / CHECKOUT (USER)
class OrderCreateSchema(BaseSchema):
    payment_provider = fields.Str(required=True,validate=validate.OneOf([p.value for p in PaymentProvider]))
    address = fields.Str(required=True,validate=validate.Length(min=5, max=255))
    phone_number = fields.Str(required=True,validate=validate.Length(min=7, max=50))
    @validates_schema
    def validate_cart_and_inventory(self, data, **kwargs):
        """
        HARD BUSINESS RULES:
        - Cart must be active
        - Cart must not be empty
        - Product must exist
        - Product must be active
        - Price must NOT change
        - Quantity must be available
        """
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
                errors[item.product_id] = "Product price has changed"
                continue
            if product.quantity < item.quantity:
                errors[item.product_id] = "Insufficient stock"
        if errors:
            raise ValidationError({"cart_items": errors})
# ADMIN ORDER UPDATE
class AdminOrderUpdateSchema(BaseSchema):
    payment_status = fields.Str(validate=validate.OneOf([s.value for s in OrderPaymentStatus]))
    delivery_status = fields.Str(validate=validate.OneOf([s.value for s in DeliveryStatus]))
    @validates_schema
    def validate_not_empty(self, data, **kwargs):
        if not data:
            raise ValidationError("At least one field must be provided")
# DELIVERY ORDER UPDATE (DELIVERY ROLE ONLY)
class DeliveryOrderUpdateSchema(BaseSchema):
    delivery_status = fields.Str(required=True,validate=validate.OneOf([DeliveryStatus.assigned.value,DeliveryStatus.on_the_way.value,DeliveryStatus.delivered.value,]))
    @validates_schema
    def validate_delivery_transition(self, data, **kwargs):
        """
        Allowed transitions:
        assigned     -> on_the_way
        on_the_way   -> delivered
        """
        order = self.context.get("order")
        if not order:
            raise ValidationError("Order context is required")
        current = order.delivery_status.value
        new = data["delivery_status"]
        allowed_transitions = {
            DeliveryStatus.assigned.value: {DeliveryStatus.on_the_way.value},
            DeliveryStatus.on_the_way.value: {DeliveryStatus.delivered.value},
        }
        if current not in allowed_transitions:
            raise ValidationError("Order cannot be updated at this stage")
        if new not in allowed_transitions[current]:
            raise ValidationError(
                f"Invalid delivery status transition: {current} → {new}")
