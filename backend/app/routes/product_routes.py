from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from ..extensions import db
from ..utils.api import api_error, get_current_user, require_admin
from ..models.product import Product
from ..models.category import Category
from ..schemas.product_schema import (
    ProductResponseSchema,
    ProductCreateSchema,
    ProductUpdateSchema,
)

product_bp = Blueprint("products", __name__)


@product_bp.get("/")
def list_products():
    """
    Supports category filtering:
      - /products?category=milk   (by category name)
      - /products?category_id=3   (by category id)
    """
    category = (request.args.get("category") or "").strip()
    category_id = request.args.get("category_id")

    q = Product.query

    if category:
        q = q.join(Product.categories).filter(Category.name.ilike(category))
    elif category_id:
        try:
            cid = int(category_id)
        except ValueError:
            return api_error("category_id must be an integer", 400)
        q = q.join(Product.categories).filter(Category.id == cid)

    products = q.all()
    return jsonify(ProductResponseSchema(many=True).dump(products)), 200


@product_bp.get("/<int:product_id>")
def get_product(product_id):
    product = Product.query.get(product_id)
    if not product:
        return api_error("Product not found", 404)
    return jsonify(ProductResponseSchema().dump(product)), 200


@product_bp.post("/")
@jwt_required()
def create_product():
    user, err = get_current_user()
    if err:
        return err
    err = require_admin(user)
    if err:
        return err

    data = request.get_json(silent=True) or {}
    try:
        validated = ProductCreateSchema().load(data)
    except ValidationError as ve:
        return api_error("Validation error", 400, ve.messages)

    category_ids = validated.get("category_ids", [])
    if not category_ids:
        return api_error("Product must belong to at least one category", 400)

    categories = Category.query.filter(Category.id.in_(category_ids)).all()
    if len(categories) != len(category_ids):
        return api_error("One or more categories not found", 400)

    product = Product(
        name=validated["name"],
        description=validated.get("description"),
        price_amount=validated["price_amount"],
        currency=validated.get("currency", "ILS"),
        quantity=validated["quantity"],
        is_active=validated.get("is_active", True),
    )
    product.categories = categories

    db.session.add(product)
    db.session.commit()
    return jsonify(ProductResponseSchema().dump(product)), 201


@product_bp.put("/<int:product_id>")
@jwt_required()
def update_product(product_id):
    user, err = get_current_user()
    if err:
        return err
    err = require_admin(user)
    if err:
        return err

    product = Product.query.get(product_id)
    if not product:
        return api_error("Product not found", 404)

    data = request.get_json(silent=True) or {}
    try:
        validated = ProductUpdateSchema().load(data, partial=True)
    except ValidationError as ve:
        return api_error("Validation error", 400, ve.messages)

    for k, v in validated.items():
        if k == "category_ids":
            if not v:
                return api_error("Product must belong to at least one category", 400)
            categories = Category.query.filter(Category.id.in_(v)).all()
            if len(categories) != len(v):
                return api_error("One or more categories not found", 400)
            product.categories = categories
        else:
            setattr(product, k, v)

    db.session.commit()
    return jsonify(ProductResponseSchema().dump(product)), 200


@product_bp.delete("/<int:product_id>")
@jwt_required()
def delete_product(product_id):
    user, err = get_current_user()
    if err:
        return err
    err = require_admin(user)
    if err:
        return err

    product = Product.query.get(product_id)
    if not product:
        return api_error("Product not found", 404)

    db.session.delete(product)
    db.session.commit()
    return jsonify({"message": "Product deleted"}), 200
