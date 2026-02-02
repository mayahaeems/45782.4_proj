from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from ..extensions import db
from ..utils.api import api_error, get_current_user, require_admin
from ..models.category import Category
from ..models.image import CategoryImage
from ..schemas.category_schema import (CategoryResponseSchema,CategoryCreateSchema,CategoryUpdateSchema,
)

category_bp = Blueprint("categories", __name__)


@category_bp.get("/")
def list_categories():
    categories = Category.query.all()
    return jsonify(CategoryResponseSchema(many=True).dump(categories)), 200


@category_bp.get("/<int:category_id>")
def get_category(category_id):
    category = Category.query.get(category_id)
    if not category:
        return api_error("Category not found", 404)
    return jsonify(CategoryResponseSchema().dump(category)), 200


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

    img = CategoryImage(
        category_id=category.id,
        storage_key=validated["image_storage_key"],
    )
    db.session.add(img)

    db.session.commit()
    return jsonify(CategoryResponseSchema().dump(category)), 201


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
        validated = CategoryUpdateSchema().load(data, partial=True)
    except ValidationError as ve:
        return api_error("Validation error", 400, ve.messages)

    # update base fields
    if "name" in validated:
        category.name = validated["name"]
    if "description" in validated:
        category.description = validated["description"]

    # update image if provided
    if "image_storage_key" in validated:
        if category.image:
            category.image.storage_key = validated["image_storage_key"]
        else:
            db.session.add(CategoryImage(
                category_id=category.id,
                storage_key=validated["image_storage_key"],
            ))

    db.session.commit()
    return jsonify(CategoryResponseSchema().dump(category)), 200


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

    db.session.delete(category)
    db.session.commit()
    return jsonify({"message": "Category deleted"}), 200
