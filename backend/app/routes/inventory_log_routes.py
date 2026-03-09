from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from ..extensions import db
from ..models.logs import InventoryLog, InventoryChangeType
from ..schemas.log_schema import (
    InventoryLogResponseSchema,
    InventoryLogCreateSchema,
    InventoryLogUpdateSchema,
)
from ..utils.api import api_error, get_current_user, require_admin

inventory_log_bp = Blueprint("inventory_logs", __name__)


# ── GET /inventory-logs ────────────────────────────────────────────────────────
# ADMIN only — list all logs, optional filters via query params
@inventory_log_bp.get("/")
@jwt_required()
def list_inventory_logs():
    user, err = get_current_user()
    if err:
        return err
    err = require_admin(user)
    if err:
        return err

    q = InventoryLog.query

    # optional filters
    product_id  = request.args.get("product_id")
    change_type = request.args.get("change_type")

    if product_id:
        try:
            q = q.filter_by(product_id=int(product_id))
        except ValueError:
            return api_error("product_id must be an integer", 400)

    if change_type:
        try:
            q = q.filter_by(change_type=InventoryChangeType(change_type))
        except ValueError:
            return api_error(
                f"Invalid change_type. Valid values: "
                f"{[c.value for c in InventoryChangeType]}", 400
            )

    logs = q.order_by(InventoryLog.created_at.desc()).all()
    return jsonify(InventoryLogResponseSchema(many=True).dump(logs)), 200


# ── GET /inventory-logs/product/<product_id> ───────────────────────────────────
# ADMIN only — all logs for a specific product
@inventory_log_bp.get("/product/<int:product_id>")
@jwt_required()
def get_logs_by_product(product_id):
    user, err = get_current_user()
    if err:
        return err
    err = require_admin(user)
    if err:
        return err

    logs = (
        InventoryLog.query
        .filter_by(product_id=product_id)
        .order_by(InventoryLog.created_at.desc())
        .all()
    )
    return jsonify(InventoryLogResponseSchema(many=True).dump(logs)), 200


# ── GET /inventory-logs/<id> ───────────────────────────────────────────────────
# ADMIN only — single log entry
@inventory_log_bp.get("/<int:log_id>")
@jwt_required()
def get_inventory_log(log_id):
    user, err = get_current_user()
    if err:
        return err
    err = require_admin(user)
    if err:
        return err

    log = InventoryLog.query.get(log_id)
    if not log:
        return api_error("Log entry not found", 404)

    return jsonify(InventoryLogResponseSchema().dump(log)), 200


# ── POST /inventory-logs ───────────────────────────────────────────────────────
# ADMIN only — manually create a log (e.g. offline stock correction note)
@inventory_log_bp.post("/")
@jwt_required()
def create_inventory_log():
    user, err = get_current_user()
    if err:
        return err
    err = require_admin(user)
    if err:
        return err

    data = request.get_json(silent=True) or {}
    try:
        validated = InventoryLogCreateSchema().load(data)
    except ValidationError as ve:
        return api_error("Validation error", 400, ve.messages)

    log = InventoryLog(
        user_id=user.id,
        product_id=validated["product_id"],
        change_type=InventoryChangeType(validated["change_type"]),
        old_value=validated.get("old_value"),
        new_value=validated.get("new_value"),
        note=validated.get("note"),
    )
    db.session.add(log)
    db.session.commit()

    return jsonify(InventoryLogResponseSchema().dump(log)), 201


# ── PUT /inventory-logs/<id> ───────────────────────────────────────────────────
# ADMIN only — only the note can be updated (log data is immutable)
@inventory_log_bp.put("/<int:log_id>")
@jwt_required()
def update_inventory_log(log_id):
    user, err = get_current_user()
    if err:
        return err
    err = require_admin(user)
    if err:
        return err

    log = InventoryLog.query.get(log_id)
    if not log:
        return api_error("Log entry not found", 404)

    data = request.get_json(silent=True) or {}
    try:
        validated = InventoryLogUpdateSchema().load(data)
    except ValidationError as ve:
        return api_error("Validation error", 400, ve.messages)

    log.note = validated["note"]
    db.session.commit()

    return jsonify(InventoryLogResponseSchema().dump(log)), 200


# ── DELETE /inventory-logs/<id> ────────────────────────────────────────────────
# ADMIN only — delete a single log entry
@inventory_log_bp.delete("/<int:log_id>")
@jwt_required()
def delete_inventory_log(log_id):
    user, err = get_current_user()
    if err:
        return err
    err = require_admin(user)
    if err:
        return err

    log = InventoryLog.query.get(log_id)
    if not log:
        return api_error("Log entry not found", 404)

    db.session.delete(log)
    db.session.commit()
    return jsonify({"message": "Log entry deleted"}), 200
