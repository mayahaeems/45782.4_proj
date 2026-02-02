
from marshmallow import fields, validate, validates, validates_schema, ValidationError
from .base import BaseSchema
from ..models.category import Category
from ..models.image import ProductImage

# category image schema(read only)
class CategoryImageResponseSchema(BaseSchema):
    id = fields.Int(dump_only=True)
    storage_key = fields.Str(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
# category Response Schema (used for public + admin views)
class CategoryResponseSchema(BaseSchema):
    id = fields.Int(dump_only=True)
    name = fields.Str(dump_only=True)
    description = fields.Str(dump_only=True)
    image = fields.Nested(CategoryImageResponseSchema,dump_only=True,allow_none=True,)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
# category create schema (ADMIN only)
class CategoryCreateSchema(BaseSchema):
    name = fields.Str(required=True,validate=validate.Length(min=2, max=100),)
    description = fields.Str(allow_none=True)
    image_storage_key = fields.Str(required=True,validate=validate.Length(max=500),)
    @validates("name")
    def validate_name_unique(self, value, **kwargs):
        normalized = value.strip().lower()
        if Category.query.filter_by(name=normalized).first():
            raise ValidationError("Category name already exists")
# category update schema (ADMIN only)
class CategoryUpdateSchema(BaseSchema):
    name = fields.Str(validate=validate.Length(min=2, max=100))
    description = fields.Str(allow_none=True)
    image_storage_key = fields.Str(validate=validate.Length(max=500),)
    @validates("name")
    def validate_name_unique(self, value, **kwargs):
        normalized = value.strip().lower()
        category_id = self.context.get("category_id")
        existing = Category.query.filter_by(name=normalized).first()
        if existing and existing.id != category_id:
            raise ValidationError("Category name already exists")
    @validates_schema
    def validate_not_empty(self, data, **kwargs):
        if not data:
            raise ValidationError("At least one field must be provided")

