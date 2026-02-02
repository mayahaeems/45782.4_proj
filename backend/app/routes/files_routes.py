import os
from flask import Blueprint, current_app, send_from_directory
from ..utils.api import api_error

files_bp = Blueprint("files", __name__)

@files_bp.get("/<path:storage_key>")
def get_file(storage_key):
    base = current_app.config["UPLOAD_FOLDER"]
    directory = os.path.dirname(storage_key)
    filename = os.path.basename(storage_key)
    full_dir = os.path.join(base, directory)

    if not os.path.exists(os.path.join(full_dir, filename)):
        return api_error("File not found", 404)

    return send_from_directory(full_dir, filename)
