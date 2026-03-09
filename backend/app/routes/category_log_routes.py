from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from ..extensions import db
from ..models.logs import CategoryLog, CategoryChangeType
from ..schemas.log_schema import (
    CategoryLogResponseSchema,
    CategoryLogCreateSchema,
    CategoryLogUpdateSchema,
)
from ..utils.api import api_error, get_current_user, require_admin

category_log_bp = Blueprint("category_logs", __name__)


# ── GET /category-logs ─────────────────────────────────────────────────────────
# ADMIN only — list all logs, optional filters via query params
@category_log_bp.get("/")
@jwt_required()
def list_category_logs():
    user, err = get_current_user()
    if err:
        return err
    err = require_admin(user)
    if err:
        return err

    q = CategoryLog.query

    # optional filters
    category_id = request.args.get("category_id")
    change_type = request.args.get("change_type")

    if category_id:
        try:
            q = q.filter_by(category_id=int(category_id))
        except ValueError:
            return api_error("category_id must be an integer", 400)

    if change_type:
        try:
            q = q.filter_by(change_type=CategoryChangeType(change_type))
        except ValueError:
            return api_error(
                f"Invalid change_type. Valid values: "
                f"{[c.value for c in CategoryChangeType]}", 400
            )

    logs = q.order_by(CategoryLog.created_at.desc()).all()
    return jsonify(CategoryLogResponseSchema(many=True).dump(logs)), 200


# ── GET /category-logs/category/<category_id> ─────────────────────────────────
# ADMIN only — all logs for a specific category
@category_log_bp.get("/category/<int:category_id>")
@jwt_required()
def get_logs_by_category(category_id):
    user, err = get_current_user()
    if err:
        return err
    err = require_admin(user)
    if err:
        return err

    logs = (
        CategoryLog.query
        .filter_by(category_id=category_id)
        .order_by(CategoryLog.created_at.desc())
        .all()
    )
    return jsonify(CategoryLogResponseSchema(many=True).dump(logs)), 200


# ── GET /category-logs/<id> ────────────────────────────────────────────────────
# ADMIN only — single log entry
@category_log_bp.get("/<int:log_id>")
@jwt_required()
def get_category_log(log_id):
    user, err = get_current_user()
    if err:
        return err
    err = require_admin(user)
    if err:
        return err

    log = CategoryLog.query.get(log_id)
    if not log:
        return api_error("Log entry not found", 404)

    return jsonify(CategoryLogResponseSchema().dump(log)), 200


# ── POST /category-logs ────────────────────────────────────────────────────────
# ADMIN only — manually create a log
@category_log_bp.post("/")
@jwt_required()
def create_category_log():
    user, err = get_current_user()
    if err:
        return err
    err = require_admin(user)
    if err:
        return err

    data = request.get_json(silent=True) or {}
    try:
        validated = CategoryLogCreateSchema().load(data)
    except ValidationError as ve:
        return api_error("Validation error", 400, ve.messages)

    log = CategoryLog(
        user_id=user.id,
        category_id=validated["category_id"],
        change_type=CategoryChangeType(validated["change_type"]),
        old_value=validated.get("old_value"),
        new_value=validated.get("new_value"),
        note=validated.get("note"),
    )
    db.session.add(log)
    db.session.commit()

    return jsonify(CategoryLogResponseSchema().dump(log)), 201


# ── PUT /category-logs/<id> ────────────────────────────────────────────────────
# ADMIN only — only the note can be updated
@category_log_bp.put("/<int:log_id>")
@jwt_required()
def update_category_log(log_id):
    user, err = get_current_user()
    if err:
        return err
    err = require_admin(user)
    if err:
        return err

    log = CategoryLog.query.get(log_id)
    if not log:
        return api_error("Log entry not found", 404)

    data = request.get_json(silent=True) or {}
    try:
        validated = CategoryLogUpdateSchema().load(data)
    except ValidationError as ve:
        return api_error("Validation error", 400, ve.messages)

    log.note = validated["note"]
    db.session.commit()

    return jsonify(CategoryLogResponseSchema().dump(log)), 200


# ── DELETE /category-logs/<id> ─────────────────────────────────────────────────
# ADMIN only — delete a single log entry
@category_log_bp.delete("/<int:log_id>")
@jwt_required()
def delete_category_log(log_id):
    user, err = get_current_user()
    if err:
        return err
    err = require_admin(user)
    if err:
        return err

    log = CategoryLog.query.get(log_id)
    if not log:
        return api_error("Log entry not found", 404)

    db.session.delete(log)
    db.session.commit()
    return jsonify({"message": "Log entry deleted"}), 200
