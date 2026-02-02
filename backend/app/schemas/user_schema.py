from marshmallow import fields, validate, validates, validates_schema, ValidationError
from .base import BaseSchema
from ..models.user import UserRole, User

# RESPONSE SCHEMA (output only)
class UserResponseSchema(BaseSchema):
    id = fields.Int(dump_only=True)
    full_name = fields.Str(dump_only=True)
    email = fields.Email(dump_only=True)
    default_address = fields.Str(dump_only=True, allow_none=True)
    default_phone = fields.Str(dump_only=True)
    profile_image_key = fields.Str(dump_only=True, allow_none=True)
    role = fields.Method("get_role", dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

    def get_role(self, obj):
        # Handles Enum or string safely
        return getattr(obj.role, "value", str(obj.role))
    
# PUBLIC CREATE SCHEMA (role forced to USER)
class UserCreateSchema(BaseSchema):
    full_name = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=100)
    )
    email = fields.Email(required=True)
    password = fields.Str(
        required=True,
        load_only=True,
        validate=validate.Length(min=8, max=128)
    )
    default_phone = fields.Str(
        required=True,
        validate=validate.Length(min=7, max=20)
    )
    default_address = fields.Str(
        allow_none=True,
        validate=validate.Length(max=255)
    )
    # Field-level validations
    @validates("default_phone")
    def validate_phone_digits(self, value):
        if not value.isdigit():
            raise ValidationError("Phone number must contain only digits")

    @validates("email")
    def validate_email_unique(self, value):
        normalized = value.strip().lower()
        if User.query.filter_by(email=normalized).first():
            raise ValidationError("Email already exists")
        return normalized
    
# ADMIN CREATE SCHEMA (role selectable)
class AdminUserCreateSchema(UserCreateSchema):
    role = fields.Str(
        required=True,
        validate=validate.OneOf([r.value for r in UserRole])
    )

# USER UPDATE SCHEMA (self-update)
class UserUpdateSchema(BaseSchema):
    full_name = fields.Str(validate=validate.Length(min=2, max=100))
    default_phone = fields.Str(validate=validate.Length(min=7, max=20))
    default_address = fields.Str(validate=validate.Length(max=255), allow_none=True)
    password = fields.Str(load_only=True, validate=validate.Length(min=8, max=128))
    profile_image_key = fields.Str(allow_none=True, validate=validate.Length(max=500))
    @validates("default_phone")
    def validate_phone_digits(self, value):
        if value is not None and not value.isdigit():
            raise ValidationError("Phone number must contain only digits")
    @validates_schema
    def validate_not_empty(self, data, **kwargs):
        if not data:
            raise ValidationError("At least one field must be provided")
        
# ADMIN UPDATE SCHEMA (can change role)
class AdminUserUpdateSchema(UserUpdateSchema):
    role = fields.Str(validate=validate.OneOf([r.value for r in UserRole]))
