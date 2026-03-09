from marshmallow import fields, validate, validates, validates_schema, ValidationError
from .base import BaseSchema
from ..models.category import Category
from ..models.image import ProductImage


# ── IMAGE (read only) ──────────────────────────────────────────────────────────
class ProductImageResponseSchema(BaseSchema):
    id          = fields.Int(dump_only=True)
    storage_key = fields.Str(dump_only=True)
    url         = fields.Method("get_url", dump_only=True)
    created_at  = fields.DateTime(dump_only=True)

    def get_url(self, obj):
        return f"/files/{obj.storage_key}"


# ── CATEGORY MINI (nested inside product) ─────────────────────────────────────
class CategoryMiniResponseSchema(BaseSchema):
    id   = fields.Int(dump_only=True)
    name = fields.Str(dump_only=True)


# ── FULL PRODUCT RESPONSE ──────────────────────────────────────────────────────
class ProductResponseSchema(BaseSchema):
    id           = fields.Int(dump_only=True)
    name         = fields.Str(dump_only=True)
    description  = fields.Str(dump_only=True, allow_none=True)
    price_amount = fields.Int(dump_only=True)
    currency     = fields.Str(dump_only=True)
    quantity     = fields.Int(dump_only=True)
    is_active    = fields.Bool(dump_only=True)
    categories   = fields.List(fields.Nested(CategoryMiniResponseSchema), dump_only=True)
    images       = fields.List(fields.Nested(ProductImageResponseSchema), dump_only=True)
    main_image_id = fields.Int(dump_only=True, allow_none=True)
    main_image   = fields.Nested(ProductImageResponseSchema, dump_only=True, allow_none=True)
    created_at   = fields.DateTime(dump_only=True)
    updated_at   = fields.DateTime(dump_only=True)


# ── PRODUCT LIST (lighter — for category pages, search, cart previews) ─────────
class ProductListSchema(BaseSchema):
    id           = fields.Int(dump_only=True)
    name         = fields.Str(dump_only=True)
    price_amount = fields.Int(dump_only=True)
    currency     = fields.Str(dump_only=True)
    quantity     = fields.Int(dump_only=True)
    is_active    = fields.Bool(dump_only=True)
    main_image_id = fields.Int(dump_only=True, allow_none=True)
    main_image   = fields.Nested(ProductImageResponseSchema, dump_only=True, allow_none=True)


# ── PRODUCT CREATE (ADMIN only) ────────────────────────────────────────────────
class ProductCreateSchema(BaseSchema):
    name         = fields.Str(required=True, validate=validate.Length(min=2, max=150))
    description  = fields.Str(allow_none=True)
    price_amount = fields.Int(required=True, validate=validate.Range(min=0))
    currency     = fields.Str(load_default="ILS", validate=validate.Length(equal=3))
    quantity     = fields.Int(required=True, validate=validate.Range(min=0))
    is_active    = fields.Bool(load_default=True)
    category_ids = fields.List(fields.Int(), required=True, validate=validate.Length(min=1))
    image_storage_keys = fields.List(fields.Str(), load_default=[])
    @validates("category_ids")
    def validate_categories_exist(self, value, **kwargs):
        existing = Category.query.filter(Category.id.in_(set(value))).count()
        if existing != len(set(value)):
            raise ValidationError("One or more categories do not exist")


# ── PRODUCT UPDATE (ADMIN only) ────────────────────────────────────────────────
class ProductUpdateSchema(BaseSchema):
    name         = fields.Str(validate=validate.Length(min=2, max=150))
    description  = fields.Str(allow_none=True)
    price_amount = fields.Int(validate=validate.Range(min=0))
    quantity     = fields.Int(validate=validate.Range(min=0))
    is_active    = fields.Bool()
    main_image_id = fields.Int(allow_none=True)
    category_ids = fields.List(fields.Int())

    @validates("category_ids")
    def validate_categories_exist(self, value, **kwargs):
        if not value:
            raise ValidationError("Product must belong to at least one category")
        existing = Category.query.filter(Category.id.in_(set(value))).count()
        if existing != len(set(value)):
            raise ValidationError("One or more categories do not exist")

    @validates("main_image_id")
    def validate_main_image(self, value, **kwargs):
        if value is None:
            return
        product_id = self.context.get("product_id")
        if not product_id:
            raise ValidationError("Product context is required for image validation")
        image = ProductImage.query.filter_by(id=value, product_id=product_id).first()
        if not image:
            raise ValidationError("Main image must belong to this product")

    @validates_schema
    def validate_not_empty(self, data, **kwargs):
        if not data:
            raise ValidationError("At least one field must be provided")
