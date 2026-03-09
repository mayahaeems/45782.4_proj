import os
from flask import Blueprint, current_app, request, jsonify, send_from_directory
from flask_jwt_extended import jwt_required

from ..utils.api import api_error, get_current_user, require_admin
from ..utils.upload import upload_image, delete_image, UploadError, ALLOWED_FOLDERS

files_bp = Blueprint("files", __name__)


# ── GET /files/<storage_key> ───────────────────────────────────────────────────
# PUBLIC — serve any uploaded file by its storage key
@files_bp.get("/<path:storage_key>")
def get_file(storage_key):
    base      = current_app.config["UPLOAD_FOLDER"]
    directory = os.path.dirname(storage_key)
    filename  = os.path.basename(storage_key)
    full_dir  = os.path.join(base, directory)

    if not os.path.exists(os.path.join(full_dir, filename)):
        return api_error("File not found", 404)

    return send_from_directory(full_dir, filename)


# ── POST /files/upload ─────────────────────────────────────────────────────────
# ADMIN only — upload an image, returns storage_key to save in product/category
# multipart/form-data, field name = "file"
# optional query param: ?folder=products | categories | users | general
@files_bp.post("/upload")
@jwt_required()
def upload_file():
    user, err = get_current_user()
    if err:
        return err
    err = require_admin(user)
    if err:
        return err

    if "file" not in request.files:
        return api_error("No file in request. Use field name 'file'", 400)

    file   = request.files["file"]
    folder = (request.args.get("folder") or "general").strip().lower()

    if folder not in ALLOWED_FOLDERS:
        return api_error(
            f"Invalid folder. Allowed: {', '.join(sorted(ALLOWED_FOLDERS))}", 400
        )

    try:
        storage_key = upload_image(file, folder)
    except UploadError as e:
        return api_error(str(e), 400)

    return jsonify({
        "message":     "File uploaded successfully",
        "storage_key": storage_key,
        "url":         f"/files/{storage_key}",
    }), 201


# ── DELETE /files/<storage_key> ────────────────────────────────────────────────
# ADMIN only — delete a file from disk
@files_bp.delete("/<path:storage_key>")
@jwt_required()
def delete_file(storage_key):
    user, err = get_current_user()
    if err:
        return err
    err = require_admin(user)
    if err:
        return err

    try:
        delete_image(storage_key)
    except UploadError as e:
        return api_error(str(e), 404)

    return jsonify({
        "message":     "File deleted",
        "storage_key": storage_key,
    }), 200
