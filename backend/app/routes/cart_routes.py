from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from ..extensions import db
from ..models.cart import Cart, CartItem
from ..models.product import Product
from ..schemas.cart_schema import CartResponseSchema, CartItemAddSchema, CartItemUpdateSchema
from ..utils.api import api_error, get_current_user

cart_bp = Blueprint("cart", __name__)


@cart_bp.get("/")
@jwt_required()
def get_cart():
    user, err = get_current_user()
    if err:
        return err
    cart = Cart.get_or_create_active(user.id)
    return jsonify(CartResponseSchema().dump(cart)), 200


@cart_bp.post("/items")
@jwt_required()
def add_item():
    user, err = get_current_user()
    if err:
        return err

    data = request.get_json(silent=True) or {}
    try:
        validated = CartItemAddSchema().load(data)
    except ValidationError as ve:
        return api_error("Validation error", 400, ve.messages)

    cart = Cart.get_or_create_active(user.id)

    product = Product.query.get(validated["product_id"])
    if not product:
        return api_error("Product not found", 404)
    if not product.is_active:
        return api_error("Product is inactive", 400)

    qty_to_add = validated["quantity"]
    if product.quantity < qty_to_add:
        return api_error("Insufficient product quantity", 400)

    existing = CartItem.query.filter_by(cart_id=cart.id, product_id=product.id).first()
    if existing:
        new_qty = existing.quantity + qty_to_add
        if product.quantity < new_qty:
            return api_error("Insufficient product quantity", 400)

        existing.quantity = new_qty
        existing.unit_amount = product.price_amount  # refresh snapshot
    else:
        item = CartItem(
            cart_id=cart.id,
            product_id=product.id,
            quantity=qty_to_add,
            unit_amount=product.price_amount,  # snapshot price
        )
        db.session.add(item)

    db.session.commit()
    return jsonify(CartResponseSchema().dump(cart)), 200


@cart_bp.put("/items/<int:item_id>")
@jwt_required()
def update_item(item_id):
    user, err = get_current_user()
    if err:
        return err

    data = request.get_json(silent=True) or {}
    try:
        validated = CartItemUpdateSchema().load(data)
    except ValidationError as ve:
        return api_error("Validation error", 400, ve.messages)

    cart = Cart.get_or_create_active(user.id)
    item = CartItem.query.filter_by(id=item_id, cart_id=cart.id).first()
    if not item:
        return api_error("Cart item not found", 404)

    product = Product.query.get(item.product_id)
    if not product:
        return api_error("Product not found", 404)
    if not product.is_active:
        return api_error("Product is inactive", 400)

    new_qty = validated["quantity"]
    if product.quantity < new_qty:
        return api_error("Insufficient product quantity", 400)

    item.quantity = new_qty
    item.unit_amount = product.price_amount  # refresh snapshot
    db.session.commit()

    return jsonify(CartResponseSchema().dump(cart)), 200


@cart_bp.delete("/items/<int:item_id>")
@jwt_required()
def delete_item(item_id):
    user, err = get_current_user()
    if err:
        return err

    cart = Cart.get_or_create_active(user.id)
    item = CartItem.query.filter_by(id=item_id, cart_id=cart.id).first()
    if not item:
        return api_error("Cart item not found", 404)

    db.session.delete(item)
    db.session.commit()

    return jsonify(CartResponseSchema().dump(cart)), 200
