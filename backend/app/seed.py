"""
seed.py — populate the database with initial data on first startup.
- Checks if data exists and skips if so
- Auto-generates placeholder images on disk for every seeded product/category
- Writes InventoryLog + CategoryLog entries
- Rolls back cleanly on any error
"""
import os
from werkzeug.security import generate_password_hash
from flask import current_app

from .extensions import db
from .models.user import User, UserRole
from .models.category import Category
from .models.image import CategoryImage, ProductImage
from .models.product import Product
from .models.logs import (
    InventoryLog, InventoryChangeType,
    CategoryLog, CategoryChangeType,
)


# ══════════════════════════════════════════════════════════════════════════════
# IMAGE GENERATION
# ══════════════════════════════════════════════════════════════════════════════

CATEGORY_COLORS = {
    "dairy":      "#FFF9C4",
    "meat":       "#FFCDD2",
    "produce":    "#DCEDC8",
    "bakery":     "#FFE0B2",
    "beverages":  "#B3E5FC",
    "pantry":     "#F3E5F5",
    "snacks":     "#FCE4EC",
    "frozen":     "#E0F7FA",
    "categories": "#E8EAF6",
    "products":   "#ECEFF1",
}

PRODUCT_CATEGORY_MAP = {
    "milk": "dairy", "yogurt": "dairy", "cottage": "dairy", "cheese": "dairy", "butter": "dairy",
    "chicken": "meat", "beef": "meat", "steak": "meat", "ground": "meat",
    "tomato": "produce", "cucumber": "produce", "banana": "produce",
    "apple": "produce", "avocado": "produce", "onion": "produce",
    "sourdough": "bakery", "pita": "bakery", "croissant": "bakery", "bread": "bakery",
    "water": "beverages", "cola": "beverages", "juice": "beverages", "sparkling": "beverages",
    "pasta": "pantry", "rice": "pantry", "sauce": "pantry", "tuna": "pantry",
    "olive": "pantry", "hummus": "pantry", "spaghetti": "pantry",
    "chips": "snacks", "chocolate": "snacks", "cookies": "snacks", "peanuts": "snacks",
    "frozen": "frozen", "ice": "frozen", "pizza": "frozen",
}


def _color_for(folder, name):
    name_lower = name.lower()
    if folder == "categories":
        for key, color in CATEGORY_COLORS.items():
            if key in name_lower:
                return color
        return CATEGORY_COLORS["categories"]
    for word in name_lower.split():
        cat = PRODUCT_CATEGORY_MAP.get(word.strip("()"))
        if cat:
            return CATEGORY_COLORS[cat]
    return CATEGORY_COLORS["products"]


def _make_image(name, folder, out_path):
    """Generate a colored placeholder WebP tile with the item name."""
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        return  # Pillow not installed — skip silently

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    if os.path.exists(out_path):
        return  # already exists — don't overwrite

    SIZE = (400, 400)
    img  = Image.new("RGB", SIZE, color=_color_for(folder, name))
    draw = ImageDraw.Draw(img)
    draw.rectangle([2, 2, SIZE[0]-3, SIZE[1]-3], outline="#B0BEC5", width=3)

    try:
        font  = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
        small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
    except Exception:
        font  = ImageFont.load_default()
        small = font

    # folder label top
    draw.text((SIZE[0]//2, 30), folder.upper(), font=small, fill="#B0BEC5", anchor="mm")

    # wrap name
    words, lines, line = name.split(), [], ""
    for w in words:
        if len(line) + len(w) + 1 <= 16:
            line = (line + " " + w).strip()
        else:
            if line:
                lines.append(line)
            line = w
    if line:
        lines.append(line)

    total_h = len(lines) * 28
    start_y = SIZE[1] // 2 - total_h // 2
    for i, l in enumerate(lines):
        draw.text((SIZE[0]//2, start_y + i*28), l, font=font, fill="#37474F", anchor="mm")

    img.save(out_path, "WEBP", quality=80)


def _generate_all_images(upload_folder, image_manifest):
    """Generate placeholder images for every storage_key in manifest."""
    print("🖼  Generating placeholder images...")
    count = 0
    for folder, name, key in image_manifest:
        out_path = os.path.join(upload_folder, key)
        _make_image(name, folder, out_path)
        count += 1
    print(f"   ✓ {count} images written to {upload_folder}")


# ══════════════════════════════════════════════════════════════════════════════
# DB HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _user(full_name, email, password, role, phone, address=None):
    if User.query.filter_by(email=email).first():
        return
    db.session.add(User(
        full_name=full_name,
        email=email,
        password_hash=generate_password_hash(password),
        role=role,
        default_phone=phone,
        default_address=address,
    ))


def _category(name, description, image_key):
    c = Category.query.filter_by(name=name).first()
    if c:
        if not CategoryImage.query.filter_by(category_id=c.id).first():
            db.session.add(CategoryImage(category_id=c.id, storage_key=image_key))
        return c
    c = Category(name=name, description=description)
    db.session.add(c)
    db.session.flush()
    db.session.add(CategoryImage(category_id=c.id, storage_key=image_key))
    return c


def _product(name, description, price, qty, categories, image_key, currency="ILS"):
    p = Product.query.filter_by(name=name).first()
    if p:
        return p
    p = Product(
        name=name, description=description,
        price_amount=price, currency=currency,
        quantity=qty, is_active=True,
    )
    p.categories = categories
    db.session.add(p)
    db.session.flush()
    img = ProductImage(product_id=p.id, storage_key=image_key)
    db.session.add(img)
    db.session.flush()
    p.main_image_id = img.id
    return p


# ══════════════════════════════════════════════════════════════════════════════
# MAIN SEED
# ══════════════════════════════════════════════════════════════════════════════

def seed_db():
    print("🌱 Checking seed...")

    if User.query.first() or Category.query.first() or Product.query.first():
        print("⚠️  DB already has data — skipping seed.")
        return

    print("🌱 Seeding database...")

    try:
        # ── USERS ──────────────────────────────────────────────────────────────
        _user("Noa Levi",       "admin@supermart.local",     "Admin123!",    UserRole.ADMIN,    "0501111111", "1 Rothschild Blvd, Tel Aviv")
        _user("Omer Cohen",     "delivery1@supermart.local", "Delivery123!", UserRole.DELIVERY, "0522222222", "Logistics Hub, Industrial Zone")
        _user("Yael Mizrahi",   "delivery2@supermart.local", "Delivery123!", UserRole.DELIVERY, "0533333333", "Warehouse A, Loading Dock 3")
        _user("Maya Haeems",    "maya@supermart.local",      "User123!",     UserRole.USER,     "0544444444", "12 Herzl St, Haifa")
        _user("Daniel Katz",    "daniel@supermart.local",    "User123!",     UserRole.USER,     "0545555555", "88 Jabotinsky Rd, Ramat Gan")
        _user("Shira Ben-David","shira@supermart.local",     "User123!",     UserRole.USER,     "0506666666", "5 Hameyasdim St, Petah Tikva")
        _user("Eitan Shalom",   "eitan@supermart.local",     "User123!",     UserRole.USER,     "0527777777", "19 Ibn Gabirol St, Tel Aviv")
        _user("Lior Friedman",  "lior@supermart.local",      "User123!",     UserRole.USER,     "0538888888", "3 Weizmann St, Rehovot")
        _user("Tamar Azulay",   "tamar@supermart.local",     "User123!",     UserRole.USER,     "0509999999", "27 Allenby St, Tel Aviv")
        _user("Amit Peretz",    "amit@supermart.local",      "User123!",     UserRole.USER,     "0521212121", "44 King George St, Jerusalem")
        _user("Nitzan Bar-On",  "nitzan@supermart.local",    "User123!",     UserRole.USER,     "0531313131", "9 Ben Yehuda St, Netanya")

        db.session.flush()
        admin = User.query.filter_by(email="admin@supermart.local").first()

        # ── CATEGORIES ─────────────────────────────────────────────────────────
        dairy   = _category("Dairy",              "Milk, cheese, yogurt and more",    "categories/dairy.webp")
        meat    = _category("Meat & Poultry",     "Fresh meat and chicken",            "categories/meat.webp")
        produce = _category("Fruits & Vegetables","Fresh produce daily",               "categories/produce.webp")
        bakery  = _category("Bakery",             "Bread, rolls, pastries",            "categories/bakery.webp")
        drinks  = _category("Beverages",          "Soft drinks, water, juices",        "categories/beverages.webp")
        pantry  = _category("Pantry",             "Rice, pasta, canned food, sauces",  "categories/pantry.webp")
        snacks  = _category("Snacks",             "Chips, cookies, chocolate",         "categories/snacks.webp")
        frozen  = _category("Frozen",             "Frozen meals, ice cream, veggies",  "categories/frozen.webp")

        db.session.flush()

        # ── CATEGORY LOGS ──────────────────────────────────────────────────────
        for cat in [dairy, meat, produce, bakery, drinks, pantry, snacks, frozen]:
            db.session.add(CategoryLog(
                user_id=admin.id, category_id=cat.id,
                change_type=CategoryChangeType.created,
                new_value=cat.name, note="Initial category — seeded",
            ))

        # ── PRODUCTS ───────────────────────────────────────────────────────────
        rows = [
            # Dairy
            ("Milk 1L 3%",           "Fresh cow milk, 1 liter",           690,  80, [dairy],   "products/milk_1l.webp"),
            ("Greek Yogurt 200g",     "Creamy yogurt, high protein",        520,  60, [dairy],   "products/greek_yogurt.webp"),
            ("Cottage Cheese 250g",   "Classic cottage cheese",             590,  55, [dairy],   "products/cottage.webp"),
            ("Yellow Cheese Slices",  "Cheddar-style slices 200g",         1390,  40, [dairy],   "products/cheese_slices.webp"),
            ("Butter 200g",           "Salted butter",                     1190,  35, [dairy],   "products/butter.webp"),
            # Meat
            ("Chicken Breast 1kg",    "Fresh chicken breast",              3490,  25, [meat],    "products/chicken_breast.webp"),
            ("Ground Beef 500g",      "Lean ground beef",                  2790,  20, [meat],    "products/ground_beef.webp"),
            ("Beef Steak 400g",       "Premium steak cut",                 4590,  15, [meat],    "products/steak.webp"),
            # Produce
            ("Tomatoes 1kg",          "Fresh tomatoes",                     890,  70, [produce], "products/tomatoes.webp"),
            ("Cucumbers 1kg",         "Crunchy cucumbers",                  790,  70, [produce], "products/cucumbers.webp"),
            ("Bananas 1kg",           "Sweet bananas",                      990,  65, [produce], "products/bananas.webp"),
            ("Apples 1kg",            "Red apples",                        1190,  60, [produce], "products/apples.webp"),
            ("Avocados (3 pcs)",      "Ripe avocados",                     1690,  40, [produce], "products/avocados.webp"),
            ("Onions 1kg",            "Yellow onions",                      590,  80, [produce], "products/onions.webp"),
            # Bakery
            ("Sourdough Bread",       "Fresh baked sourdough loaf",        1390,  30, [bakery],  "products/sourdough.webp"),
            ("Pita Pack (10)",        "Soft pita bread",                    790,  45, [bakery],  "products/pita.webp"),
            ("Croissant (2)",         "Buttery croissants",                1290,  25, [bakery],  "products/croissant.webp"),
            # Beverages
            ("Mineral Water 1.5L",    "Still mineral water",                450, 120, [drinks],  "products/water_15l.webp"),
            ("Cola 1.5L",             "Classic cola drink",                 890,  80, [drinks],  "products/cola.webp"),
            ("Orange Juice 1L",       "100% orange juice",                 1390,  50, [drinks],  "products/orange_juice.webp"),
            ("Sparkling Water 1L",    "Carbonated water",                   550,  70, [drinks],  "products/sparkling_water.webp"),
            # Pantry
            ("Pasta Spaghetti 500g",  "Italian-style spaghetti",            790, 100, [pantry],  "products/spaghetti.webp"),
            ("Rice 1kg",              "Long grain rice",                    990,  90, [pantry],  "products/rice.webp"),
            ("Tomato Sauce 500g",     "Classic tomato sauce",               690,  85, [pantry],  "products/tomato_sauce.webp"),
            ("Tuna Cans (3)",         "Tuna in water",                     1590,  70, [pantry],  "products/tuna_3.webp"),
            ("Olive Oil 750ml",       "Extra virgin olive oil",            2990,  40, [pantry],  "products/olive_oil.webp"),
            ("Hummus 400g",           "Smooth hummus spread",               990,  55, [pantry],  "products/hummus.webp"),
            # Snacks
            ("Potato Chips 200g",     "Salted chips",                       890,  90, [snacks],  "products/chips.webp"),
            ("Chocolate Bar",         "Milk chocolate",                     490, 140, [snacks],  "products/chocolate.webp"),
            ("Cookies 300g",          "Butter cookies",                     990,  75, [snacks],  "products/cookies.webp"),
            ("Salted Peanuts 250g",   "Roasted peanuts",                    890,  65, [snacks],  "products/peanuts.webp"),
            # Frozen
            ("Frozen Pizza",          "Cheese pizza",                      1590,  35, [frozen],  "products/frozen_pizza.webp"),
            ("Ice Cream 1L",          "Vanilla ice cream",                 1890,  30, [frozen],  "products/ice_cream.webp"),
            ("Frozen Veg Mix 1kg",    "Mixed vegetables",                  1290,  50, [frozen],  "products/frozen_veg.webp"),
        ]

        products = [_product(n, d, p, q, c, i) for n, d, p, q, c, i in rows]
        db.session.flush()

        # ── INVENTORY LOGS ─────────────────────────────────────────────────────
        for p in products:
            db.session.add(InventoryLog(
                user_id=admin.id, product_id=p.id,
                change_type=InventoryChangeType.restock,
                old_value="0", new_value=str(p.quantity),
                note="Initial stock — seeded",
            ))

        # ── COMMIT ─────────────────────────────────────────────────────────────
        db.session.commit()

        # ── GENERATE IMAGES (after commit so DB is safe even if images fail) ───
        upload_folder = current_app.config["UPLOAD_FOLDER"]
        cat_manifest = [
            ("categories", "Dairy",               "categories/dairy.webp"),
            ("categories", "Meat & Poultry",       "categories/meat.webp"),
            ("categories", "Fruits & Vegetables",  "categories/produce.webp"),
            ("categories", "Bakery",               "categories/bakery.webp"),
            ("categories", "Beverages",            "categories/beverages.webp"),
            ("categories", "Pantry",               "categories/pantry.webp"),
            ("categories", "Snacks",               "categories/snacks.webp"),
            ("categories", "Frozen",               "categories/frozen.webp"),
        ]
        prod_manifest = [("products", n, i) for n, d, p, q, c, i in rows]
        _generate_all_images(upload_folder, cat_manifest + prod_manifest)

        print("✅ Seed complete!")
        print()
        print("  Accounts:")
        print("  admin:    admin@supermart.local     / Admin123!")
        print("  delivery: delivery1@supermart.local / Delivery123!")
        print("  user:     maya@supermart.local      / User123!")
        print()
        print(f"  {len(products)} products  |  8 categories  |  11 users")

    except Exception as e:
        db.session.rollback()
        print(f"❌ Seed failed and rolled back: {e}")
        raise