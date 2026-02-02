from dotenv import load_dotenv
from sqlalchemy import inspect
import os

load_dotenv()

from app import create_app
from app.extensions import db

# ✅ IMPORT MODELS (VERY IMPORTANT)
from app.models.user import User
from app.models.cart import Cart
from app.models.order import Order
from app.models.product import Product
from app.models.category import Category
import app.models.image  # safe module import

app = create_app()

with app.app_context():
    # 🔹 Make sure DB directory exists (inside mounted volume)
    db_path = os.getenv("SQLITE_PATH", "instance")
    os.makedirs(db_path, exist_ok=True)

    print("DB URL:", db.engine.url)

    inspector = inspect(db.engine)
    tables = inspector.get_table_names()

    if not tables:
        print("No tables found. Creating database tables...")
        db.create_all()
    else:
        print("Database already exists. Skipping table creation.")
        for table in tables:
            print("-", table)

if __name__ == "__main__":
   app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)
