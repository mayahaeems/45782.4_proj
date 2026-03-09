import os
import uuid
from PIL import Image, UnidentifiedImageError
from flask import current_app
from werkzeug.utils import secure_filename

ALLOWED_FORMATS  = {"JPEG", "PNG", "WEBP", "GIF"}
MAX_DIMENSION    = 1200   # px — max width or height after resize
WEBP_QUALITY     = 85
ALLOWED_FOLDERS  = {"products", "categories", "users", "general"}


class UploadError(Exception):
    """Raised for any invalid upload — catch in routes and return api_error."""
    pass


def upload_image(file, folder: str) -> str:
    """
    Validate, resize, convert to WebP, and save an uploaded image.

    Args:
        file:   werkzeug FileStorage object from request.files
        folder: subfolder name — must be one of ALLOWED_FOLDERS

    Returns:
        storage_key (str): e.g. "products/abc123.webp"
                           Store this in the DB and serve via /files/<key>

    Raises:
        UploadError: with a human-readable message on any failure
    """
    # ── 1. Basic checks ────────────────────────────────────────────────────────
    if not file or not file.filename:
        raise UploadError("No file provided")

    if folder not in ALLOWED_FOLDERS:
        raise UploadError(
            f"Invalid folder '{folder}'. "
            f"Allowed: {', '.join(sorted(ALLOWED_FOLDERS))}"
        )

    # ── 2. Validate with Pillow (catches non-images / corrupt files) ───────────
    try:
        img = Image.open(file)
        img.verify()          # raises if file is corrupt
        img_format = img.format
        file.seek(0)          # reset after verify (verify closes the stream)
    except UnidentifiedImageError:
        raise UploadError("File is not a valid image")
    except Exception:
        raise UploadError("Could not read image file")

    if img_format not in ALLOWED_FORMATS:
        raise UploadError(
            f"Unsupported image format '{img_format}'. "
            f"Allowed: {', '.join(sorted(ALLOWED_FORMATS))}"
        )

    # ── 3. Prepare save directory ──────────────────────────────────────────────
    upload_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], folder)
    os.makedirs(upload_dir, exist_ok=True)

    # ── 4. Generate unique filename (always .webp output) ─────────────────────
    filename  = f"{uuid.uuid4().hex}.webp"
    file_path = os.path.join(upload_dir, filename)

    # ── 5. Convert, resize, and save as WebP ──────────────────────────────────
    try:
        img = Image.open(file).convert("RGB")   # normalize (handles RGBA, P, etc.)
        img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)
        img.save(file_path, "WEBP", quality=WEBP_QUALITY, optimize=True)
    except Exception as e:
        raise UploadError(f"Failed to process image: {e}")

    # ── 6. Return DB-safe storage key ─────────────────────────────────────────
    return f"{folder}/{filename}"


def delete_image(storage_key: str) -> None:
    """
    Delete an image from disk by its storage_key.

    Args:
        storage_key: e.g. "products/abc123.webp"

    Raises:
        UploadError: if the file doesn't exist or path is invalid
    """
    base      = current_app.config["UPLOAD_FOLDER"]
    full_path = os.path.realpath(os.path.join(base, storage_key))
    real_base = os.path.realpath(base)

    # prevent path traversal attacks
    if not full_path.startswith(real_base):
        raise UploadError("Invalid storage key")

    if not os.path.exists(full_path):
        raise UploadError(f"File not found: {storage_key}")

    os.remove(full_path)
