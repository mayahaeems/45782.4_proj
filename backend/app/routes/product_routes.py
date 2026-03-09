from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from ..extensions import db
from ..utils.api import api_error, get_current_user, require_admin
from ..models.product import Product
from ..models.category import Category
from ..models.logs import InventoryLog, InventoryChangeType
from ..schemas.product_schema import (
    ProductResponseSchema,
    ProductCreateSchema,
    ProductUpdateSchema,
)

product_bp = Blueprint("products", __name__)


def _log(user_id: int, product_id: int, change_type: InventoryChangeType,
         old_value=None, new_value=None, note: str = None) -> None:
    """Helper: write one InventoryLog row."""
    db.session.add(InventoryLog(
        user_id=user_id,
        product_id=product_id,
        change_type=change_type,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        note=note,
    ))


# ── GET /products ──────────────────────────────────────────────────────────────
@product_bp.get("/")
def list_products():
    """
    Public. Supports filtering:
      ?category=<name>    — filter by category name (case-insensitive)
      ?category_id=<int>  — filter by category id
    """
    category_name = (request.args.get("category") or "").strip()
    category_id   = request.args.get("category_id")

    q = Product.query

    if category_name:
        q = q.join(Product.categories).filter(Category.name.ilike(category_name))
    elif category_id:
        try:
            cid = int(category_id)
        except ValueError:
            return api_error("category_id must be an integer", 400)
        q = q.join(Product.categories).filter(Category.id == cid)

    products = q.all()
    return jsonify(ProductResponseSchema(many=True).dump(products)), 200


# ── GET /products/<id> ─────────────────────────────────────────────────────────
@product_bp.get("/<int:product_id>")
def get_product(product_id):
    product = Product.query.get(product_id)
    if not product:
        return api_error("Product not found", 404)
    return jsonify(ProductResponseSchema().dump(product)), 200


# ── POST /products ─────────────────────────────────────────────────────────────
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
    categories = Category.query.filter(Category.id.in_(category_ids)).all()
    if len(categories) != len(set(category_ids)):
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
    db.session.flush()  # get product.id before logging
    
    # attach uploaded images
    from ..models.image import ProductImage
    for i, sk in enumerate(validated.get("image_storage_keys", [])):
        img = ProductImage(product_id=product.id, storage_key=sk)
        db.session.add(img)
        db.session.flush()
        if i == 0: product.main_image_id = img.id

    # Log: initial stock
    _log(user.id, product.id, InventoryChangeType.restock,
         old_value=0, new_value=product.quantity,
         note="Product created")

    db.session.commit()
    return jsonify(ProductResponseSchema().dump(product)), 201


# ── PUT /products/<id> ─────────────────────────────────────────────────────────
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
        validated = ProductUpdateSchema(context={"product_id": product_id}).load(data, partial=True)
    except ValidationError as ve:
        return api_error("Validation error", 400, ve.messages)

    for key, value in validated.items():
        if key == "category_ids":
            if not value:
                return api_error("Product must belong to at least one category", 400)
            categories = Category.query.filter(Category.id.in_(value)).all()
            if len(categories) != len(set(value)):
                return api_error("One or more categories not found", 400)
            product.categories = categories

        elif key == "quantity":
            _log(user.id, product.id, InventoryChangeType.restock,
                 old_value=product.quantity, new_value=value)
            product.quantity = value

        elif key == "price_amount":
            _log(user.id, product.id, InventoryChangeType.price_change,
                 old_value=product.price_amount, new_value=value)
            product.price_amount = value

        elif key == "is_active":
            change = InventoryChangeType.activated if value else InventoryChangeType.deactivated
            _log(user.id, product.id, change,
                 old_value=product.is_active, new_value=value)
            product.is_active = value

        elif key == "name":
            _log(user.id, product.id, InventoryChangeType.name_change,
                 old_value=product.name, new_value=value)
            product.name = value

        elif key == "description":
            _log(user.id, product.id, InventoryChangeType.description,
                 old_value=product.description, new_value=value)
            product.description = value

        else:
            setattr(product, key, value)

    db.session.commit()
    return jsonify(ProductResponseSchema().dump(product)), 200


# ── DELETE /products/<id> ──────────────────────────────────────────────────────
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
