from marshmallow import Schema, fields, validate, validates_schema, ValidationError
from ..models.logs import InventoryChangeType, CategoryChangeType


# ══════════════════════════════════════════════════════════════════════════════
# INVENTORY LOG SCHEMAS
# ══════════════════════════════════════════════════════════════════════════════

class InventoryLogResponseSchema(Schema):
    id          = fields.Int(dump_only=True)
    user_id     = fields.Int(dump_only=True, allow_none=True)
    product_id  = fields.Int(dump_only=True)
    change_type = fields.Function(lambda obj: obj.change_type.value)
    old_value   = fields.Str(dump_only=True, allow_none=True)
    new_value   = fields.Str(dump_only=True, allow_none=True)
    note        = fields.Str(dump_only=True, allow_none=True)
    created_at  = fields.DateTime(dump_only=True)


class InventoryLogCreateSchema(Schema):
    """Admin manually writes a log — e.g. offline stock correction."""
    product_id  = fields.Int(required=True)
    change_type = fields.Str(
        required=True,
        validate=validate.OneOf([c.value for c in InventoryChangeType])
    )
    old_value   = fields.Str(allow_none=True)
    new_value   = fields.Str(allow_none=True)
    note        = fields.Str(allow_none=True, validate=validate.Length(max=255))

    @validates_schema
    def validate_not_empty_values(self, data, **kwargs):
        if not data.get("old_value") and not data.get("new_value"):
            if data.get("change_type") not in {
                InventoryChangeType.activated.value,
                InventoryChangeType.deactivated.value,
            }:
                raise ValidationError(
                    "At least one of old_value or new_value must be provided"
                )


class InventoryLogUpdateSchema(Schema):
    """Only the note is editable — log data is immutable."""
    note = fields.Str(required=True, validate=validate.Length(min=1, max=255))


# ══════════════════════════════════════════════════════════════════════════════
# CATEGORY LOG SCHEMAS
# ══════════════════════════════════════════════════════════════════════════════

class CategoryLogResponseSchema(Schema):
    id          = fields.Int(dump_only=True)
    category_id = fields.Int(dump_only=True)
    user_id     = fields.Int(dump_only=True, allow_none=True)
    change_type = fields.Function(lambda obj: obj.change_type.value)
    old_value   = fields.Str(dump_only=True, allow_none=True)
    new_value   = fields.Str(dump_only=True, allow_none=True)
    note        = fields.Str(dump_only=True, allow_none=True)
    created_at  = fields.DateTime(dump_only=True)


class CategoryLogCreateSchema(Schema):
    """Admin manually writes a log — e.g. bulk import note."""
    category_id = fields.Int(required=True)
    change_type = fields.Str(
        required=True,
        validate=validate.OneOf([c.value for c in CategoryChangeType])
    )
    old_value   = fields.Str(allow_none=True)
    new_value   = fields.Str(allow_none=True)
    note        = fields.Str(allow_none=True, validate=validate.Length(max=255))

    @validates_schema
    def validate_not_empty_values(self, data, **kwargs):
        if not data.get("old_value") and not data.get("new_value"):
            if data.get("change_type") not in {
                CategoryChangeType.created.value,
                CategoryChangeType.deleted.value,
            }:
                raise ValidationError(
                    "At least one of old_value or new_value must be provided"
                )


class CategoryLogUpdateSchema(Schema):
    """Only the note is editable — log data is immutable."""
    note = fields.Str(required=True, validate=validate.Length(min=1, max=255))
