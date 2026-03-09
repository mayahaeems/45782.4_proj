from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from ..extensions import db
from ..utils.api import api_error, get_current_user, require_admin
from ..models.category import Category
from ..models.image import CategoryImage
from ..models.logs import CategoryLog, CategoryChangeType
from ..schemas.category_schema import (
    CategoryResponseSchema,
    CategoryCreateSchema,
    CategoryUpdateSchema,
)

category_bp = Blueprint("categories", __name__)


def _log(user_id: int, category_id: int, change_type: CategoryChangeType,
         old_value=None, new_value=None, note: str = None) -> None:
    """Helper: write one CategoryLog row."""
    db.session.add(CategoryLog(
        user_id=user_id,
        category_id=category_id,
        change_type=change_type,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        note=note,
    ))


# ── GET /categories ────────────────────────────────────────────────────────────
@category_bp.get("/")
def list_categories():
    categories = Category.query.all()
    return jsonify(CategoryResponseSchema(many=True).dump(categories)), 200


# ── GET /categories/<id> ───────────────────────────────────────────────────────
@category_bp.get("/<int:category_id>")
def get_category(category_id):
    category = Category.query.get(category_id)
    if not category:
        return api_error("Category not found", 404)
    return jsonify(CategoryResponseSchema().dump(category)), 200


# ── POST /categories ───────────────────────────────────────────────────────────
@category_bp.post("/")
@jwt_required()
def create_category():
    user, err = get_current_user()
    if err:
        return err
    err = require_admin(user)
    if err:
        return err

    data = request.get_json(silent=True) or {}
    try:
        validated = CategoryCreateSchema().load(data)
    except ValidationError as ve:
        return api_error("Validation error", 400, ve.messages)

    category = Category(
        name=validated["name"],
        description=validated.get("description"),
    )
    db.session.add(category)
    db.session.flush()  # get category.id

    # attach image
    db.session.add(CategoryImage(
        category_id=category.id,
        storage_key=validated["image_storage_key"],
    ))

    # log creation
    _log(user.id, category.id, CategoryChangeType.created,
         new_value=category.name, note="Category created")

    db.session.commit()
    return jsonify(CategoryResponseSchema().dump(category)), 201


# ── PUT /categories/<id> ───────────────────────────────────────────────────────
@category_bp.put("/<int:category_id>")
@jwt_required()
def update_category(category_id):
    user, err = get_current_user()
    if err:
        return err
    err = require_admin(user)
    if err:
        return err

    category = Category.query.get(category_id)
    if not category:
        return api_error("Category not found", 404)

    data = request.get_json(silent=True) or {}
    try:
        validated = CategoryUpdateSchema(
            context={"category_id": category_id}
        ).load(data, partial=True)
    except ValidationError as ve:
        return api_error("Validation error", 400, ve.messages)

    if "name" in validated:
        _log(user.id, category.id, CategoryChangeType.name_change,
             old_value=category.name, new_value=validated["name"])
        category.name = validated["name"]

    if "description" in validated:
        _log(user.id, category.id, CategoryChangeType.description,
             old_value=category.description, new_value=validated["description"])
        category.description = validated["description"]

    if "image_storage_key" in validated:
        old_key = category.image.storage_key if category.image else None
        _log(user.id, category.id, CategoryChangeType.image_change,
             old_value=old_key, new_value=validated["image_storage_key"])
        if category.image:
            category.image.storage_key = validated["image_storage_key"]
        else:
            db.session.add(CategoryImage(
                category_id=category.id,
                storage_key=validated["image_storage_key"],
            ))

    db.session.commit()
    return jsonify(CategoryResponseSchema().dump(category)), 200


# ── DELETE /categories/<id> ────────────────────────────────────────────────────
@category_bp.delete("/<int:category_id>")
@jwt_required()
def delete_category(category_id):
    user, err = get_current_user()
    if err:
        return err
    err = require_admin(user)
    if err:
        return err

    category = Category.query.get(category_id)
    if not category:
        return api_error("Category not found", 404)

    # log before delete (cascade will remove the log row too, but
    # this records the intent in case you ever add a soft-delete)
    _log(user.id, category.id, CategoryChangeType.deleted,
         old_value=category.name)

    db.session.delete(category)
    db.session.commit()
    return jsonify({"message": "Category deleted"}), 200
