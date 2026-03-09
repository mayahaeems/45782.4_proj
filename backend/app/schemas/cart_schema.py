from marshmallow import fields, validate, validates_schema, ValidationError
from .base import BaseSchema
from ..models.product import Product


# ── PRODUCT MINI (nested inside cart item — enough to render the cart UI) ──────
class CartProductSchema(BaseSchema):
    id           = fields.Int(dump_only=True)
    name         = fields.Str(dump_only=True)
    price_amount = fields.Int(dump_only=True)
    quantity     = fields.Int(dump_only=True)   # stock level
    is_active    = fields.Bool(dump_only=True)
    main_image   = fields.Method("get_main_image", dump_only=True)

    def get_main_image(self, obj):
        if obj.main_image:
            return {
                "id":          obj.main_image.id,
                "storage_key": obj.main_image.storage_key,
                "url":         f"/files/{obj.main_image.storage_key}",
            }
        return None


# ── CART ITEM RESPONSE ─────────────────────────────────────────────────────────
class CartItemResponseSchema(BaseSchema):
    id          = fields.Int(dump_only=True)
    product_id  = fields.Int(dump_only=True)
    quantity    = fields.Int(dump_only=True)
    unit_amount = fields.Int(dump_only=True)
    line_total  = fields.Method("get_line_total", dump_only=True)
    product     = fields.Nested(CartProductSchema, dump_only=True)   # ← ADDED

    def get_line_total(self, obj):
        return obj.unit_amount * obj.quantity


# ── CART RESPONSE ──────────────────────────────────────────────────────────────
class CartResponseSchema(BaseSchema):
    id       = fields.Int(dump_only=True)
    user_id  = fields.Int(dump_only=True)
    status   = fields.Str(dump_only=True)
    items    = fields.List(fields.Nested(CartItemResponseSchema), dump_only=True)
    subtotal = fields.Method("get_subtotal", dump_only=True)

    def get_subtotal(self, obj):
        return sum(item.unit_amount * item.quantity for item in obj.items)


# ── ADD ITEM TO CART ───────────────────────────────────────────────────────────
class CartItemAddSchema(BaseSchema):
    product_id = fields.Int(required=True)
    quantity   = fields.Int(required=True, validate=validate.Range(min=1))

    @validates_schema
    def validate_product(self, data, **kwargs):
        product = Product.query.get(data.get("product_id"))
        if not product:
            raise ValidationError({"product_id": "Product does not exist"})
        if not product.is_active:
            raise ValidationError({"product_id": "Product is inactive"})
        if product.quantity < data.get("quantity", 0):
            raise ValidationError({"quantity": "Insufficient product quantity"})


# ── UPDATE CART ITEM QUANTITY ──────────────────────────────────────────────────
class CartItemUpdateSchema(BaseSchema):
    quantity = fields.Int(required=True, validate=validate.Range(min=1))