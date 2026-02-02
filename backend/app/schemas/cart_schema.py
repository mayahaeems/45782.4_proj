from marshmallow import fields, validate, validates, validates_schema, ValidationError
from .base import BaseSchema
from ..models.product import Product
from ..models.cart import CartItem

# cart item schema 
class CartItemResponseSchema(BaseSchema):
    id = fields.Int(dump_only=True)
    product_id = fields.Int(dump_only=True)
    quantity = fields.Int(dump_only=True)
    unit_amount = fields.Int(dump_only=True)
    line_total = fields.Method("get_line_total", dump_only=True)
    def get_line_total(self, obj):
        return obj.unit_amount * obj.quantity
# cart response schema 
class CartResponseSchema(BaseSchema):
    id = fields.Int(dump_only=True)
    user_id = fields.Int(dump_only=True)
    status = fields.Str(dump_only=True)
    items = fields.List(fields.Nested(CartItemResponseSchema),dump_only=True,)
    subtotal_amount = fields.Method("get_subtotal_amount",dump_only=True,)
    def get_subtotal_amount(self, obj):
        return sum(item.unit_amount * item.quantity for item in obj.items)
# add item to cart schema 
class CartItemAddSchema(BaseSchema):
    product_id = fields.Int(required=True)
    quantity = fields.Int(required=True,validate=validate.Range(min=1))
    @validates_schema
    def validate_product(self, data, **kwargs):
        product = Product.query.get(data["product_id"])
        if not product:
            raise ValidationError("Product does not exist")
        if not product.is_active:
            raise ValidationError("Product is inactive")
        if product.quantity < data["quantity"]:
            raise ValidationError("Insufficient product quantity")
# update cart item schema(quantity changes,cart reconciliation after alerts)
class CartItemUpdateSchema(BaseSchema):
        quantity = fields.Int(required=True,validate=validate.Range(min=1))
