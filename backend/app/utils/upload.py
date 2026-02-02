import os
import uuid
from PIL import Image
from flask import current_app
from werkzeug.utils import secure_filename

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
class UploadError(Exception):
    pass
def upload_image(file, folder: str) -> str:
    """
    Multer-like image uploader
    - validates image
    - saves it
    - returns storage_key
    """
    if not file or file.filename == "":
        raise UploadError("No file provided")
    # 1️⃣ Validate image using Pillow
    try:
        img = Image.open(file)
        img.verify()
        img_format = img.format
        file.seek(0)
    except Exception:
        raise UploadError("Invalid image file")
    if img_format not in ALLOWED_FORMATS:
        raise UploadError("Unsupported image format")
    # 2️⃣ Prepare filesystem
    upload_dir = os.path.join(
        current_app.config["UPLOAD_FOLDER"],
        folder
    )
    os.makedirs(upload_dir, exist_ok=True)
    # 3️⃣ Generate filename
    filename = secure_filename(f"{uuid.uuid4()}.webp")
    file_path = os.path.join(upload_dir, filename)
    # 4️⃣ Convert + save (normalized)
    img = Image.open(file).convert("RGB")
    img.thumbnail((1200, 1200))
    img.save(file_path, "WEBP", quality=85, optimize=True)
    # 5️⃣ Return storage key (DB-safe)
    return f"{folder}/{filename}"
