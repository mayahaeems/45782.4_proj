from werkzeug.security import generate_password_hash
from .extensions import db
from .models.user import User, UserRole
from .models.category import Category
from .models.image import CategoryImage, ProductImage
from .models.product import Product


def _get_or_create_user(full_name, email, password, role, phone, address):
    u = User.query.filter_by(email=email).first()
    if u:
        return u
    u = User(
        full_name=full_name,
        email=email,
        password_hash=generate_password_hash(password),
        role=role,
        default_phone=phone,
        default_address=address,
    )
    db.session.add(u)
    return u


def _get_or_create_category(name, description, image_key):
    c = Category.query.filter_by(name=name).first()
    if c:
        # ensure image exists
        if not c.image:
            db.session.add(CategoryImage(category_id=c.id, storage_key=image_key))
        return c

    c = Category(name=name, description=description)
    db.session.add(c)
    db.session.flush()

    db.session.add(CategoryImage(category_id=c.id, storage_key=image_key))
    return c


def _create_product(name, description, price_amount, quantity, categories, image_key, currency="ILS", is_active=True):
    # prevent duplicates by name (simple approach)
    existing = Product.query.filter_by(name=name).first()
    if existing:
        return existing

    p = Product(
        name=name,
        description=description,
        price_amount=price_amount,
        currency=currency,
        quantity=quantity,
        is_active=is_active,
    )
    p.categories = categories
    db.session.add(p)
    db.session.flush()

    img = ProductImage(product_id=p.id, storage_key=image_key)
    db.session.add(img)

    # Optional: set as main image (your model supports it)
    p.main_image_id = img.id
    return p


def seed_db():
    print("🌱 Seeding database with realistic data...")

    # If anything exists, skip (safe)
    if User.query.first() or Category.query.first() or Product.query.first():
        print("⚠ DB already has data. Skipping seed.")
        return

    # -------------------- USERS --------------------
    _get_or_create_user(
        full_name="Noa Levi",
        email="admin@supermart.local",
        password="Admin123!",
        role=UserRole.ADMIN,
        phone="050-1111111",
        address="1 Rothschild Blvd, Tel Aviv",
    )

    _get_or_create_user(
        full_name="Omer Cohen",
        email="delivery1@supermart.local",
        password="Delivery123!",
        role=UserRole.DELIVERY,
        phone="052-2222222",
        address="Logistics Hub, Industrial Zone",
    )

    _get_or_create_user(
        full_name="Yael Mizrahi",
        email="delivery2@supermart.local",
        password="Delivery123!",
        role=UserRole.DELIVERY,
        phone="053-3333333",
        address="Warehouse A, Loading Dock 3",
    )

    regular_users = [
        ("Maya Haeems", "maya@supermart.local", "User123!", "054-4444444", "12 Herzl St, Haifa"),
        ("Daniel Katz", "daniel@supermart.local", "User123!", "054-5555555", "88 Jabotinsky Rd, Ramat Gan"),
        ("Shira Ben-David", "shira@supermart.local", "User123!", "050-6666666", "5 Hameyasdim St, Petah Tikva"),
        ("Eitan Shalom", "eitan@supermart.local", "User123!", "052-7777777", "19 Ibn Gabirol St, Tel Aviv"),
        ("Lior Friedman", "lior@supermart.local", "User123!", "053-8888888", "3 Weizmann St, Rehovot"),
        ("Tamar Azulay", "tamar@supermart.local", "User123!", "050-9999999", "27 Allenby St, Tel Aviv"),
        ("Amit Peretz", "amit@supermart.local", "User123!", "052-1212121", "44 King George St, Jerusalem"),
        ("Nitzan Bar-On", "nitzan@supermart.local", "User123!", "053-1313131", "9 Ben Yehuda St, Netanya"),
    ]

    for full_name, email, pw, phone, addr in regular_users:
        _get_or_create_user(full_name, email, pw, UserRole.USER, phone, addr)

    db.session.flush()

    # -------------------- CATEGORIES --------------------
    dairy = _get_or_create_category("Dairy", "Milk, cheese, yogurt and more", "categories/dairy.webp")
    meat = _get_or_create_category("Meat & Poultry", "Fresh meat and chicken", "categories/meat.webp")
    produce = _get_or_create_category("Fruits & Vegetables", "Fresh produce daily", "categories/produce.webp")
    bakery = _get_or_create_category("Bakery", "Bread, rolls, pastries", "categories/bakery.webp")
    drinks = _get_or_create_category("Beverages", "Soft drinks, water, juices", "categories/beverages.webp")
    pantry = _get_or_create_category("Pantry", "Rice, pasta, canned food, sauces", "categories/pantry.webp")
    snacks = _get_or_create_category("Snacks", "Chips, cookies, chocolate", "categories/snacks.webp")
    frozen = _get_or_create_category("Frozen", "Frozen meals, ice cream, veggies", "categories/frozen.webp")

    db.session.flush()

    # -------------------- PRODUCTS (REALISTIC LIST) --------------------
    # Prices are in agorot (minor units). Example: 1290 = ₪12.90
    products = [
        # Dairy
        ("Milk 1L 3%", "Fresh cow milk, 1 liter", 690, 80, [dairy], "products/milk_1l.webp"),
        ("Greek Yogurt 200g", "Creamy yogurt, high protein", 520, 60, [dairy], "products/greek_yogurt.webp"),
        ("Cottage Cheese 250g", "Classic cottage cheese", 590, 55, [dairy], "products/cottage.webp"),
        ("Yellow Cheese Slices 200g", "Cheddar-style slices", 1390, 40, [dairy], "products/cheese_slices.webp"),
        ("Butter 200g", "Salted butter", 1190, 35, [dairy], "products/butter.webp"),

        # Meat & Poultry
        ("Chicken Breast 1kg", "Fresh chicken breast", 3490, 25, [meat], "products/chicken_breast.webp"),
        ("Ground Beef 500g", "Lean ground beef", 2790, 20, [meat], "products/ground_beef.webp"),
        ("Beef Steak 400g", "Premium steak cut", 4590, 15, [meat], "products/steak.webp"),

        # Produce
        ("Tomatoes 1kg", "Fresh tomatoes", 890, 70, [produce], "products/tomatoes.webp"),
        ("Cucumbers 1kg", "Crunchy cucumbers", 790, 70, [produce], "products/cucumbers.webp"),
        ("Bananas 1kg", "Sweet bananas", 990, 65, [produce], "products/bananas.webp"),
        ("Apples 1kg", "Red apples", 1190, 60, [produce], "products/apples.webp"),
        ("Avocados (3 pcs)", "Ripe avocados", 1690, 40, [produce], "products/avocados.webp"),
        ("Onions 1kg", "Yellow onions", 590, 80, [produce], "products/onions.webp"),

        # Bakery
        ("Sourdough Bread", "Fresh baked sourdough loaf", 1390, 30, [bakery], "products/sourdough.webp"),
        ("Pita Pack (10)", "Soft pita bread", 790, 45, [bakery], "products/pita.webp"),
        ("Croissant (2)", "Buttery croissants", 1290, 25, [bakery], "products/croissant.webp"),

        # Beverages
        ("Mineral Water 1.5L", "Still mineral water", 450, 120, [drinks], "products/water_15l.webp"),
        ("Cola 1.5L", "Classic cola drink", 890, 80, [drinks], "products/cola.webp"),
        ("Orange Juice 1L", "100% orange juice", 1390, 50, [drinks], "products/orange_juice.webp"),
        ("Sparkling Water 1L", "Carbonated water", 550, 70, [drinks], "products/sparkling_water.webp"),

        # Pantry
        ("Pasta Spaghetti 500g", "Italian-style spaghetti", 790, 100, [pantry], "products/spaghetti.webp"),
        ("Rice 1kg", "Long grain rice", 990, 90, [pantry], "products/rice.webp"),
        ("Tomato Sauce 500g", "Classic tomato sauce", 690, 85, [pantry], "products/tomato_sauce.webp"),
        ("Tuna Cans (3)", "Tuna in water", 1590, 70, [pantry], "products/tuna_3.webp"),
        ("Olive Oil 750ml", "Extra virgin olive oil", 2990, 40, [pantry], "products/olive_oil.webp"),
        ("Hummus 400g", "Smooth hummus spread", 990, 55, [pantry], "products/hummus.webp"),

        # Snacks
        ("Potato Chips 200g", "Salted chips", 890, 90, [snacks], "products/chips.webp"),
        ("Chocolate Bar", "Milk chocolate", 490, 140, [snacks], "products/chocolate.webp"),
        ("Cookies 300g", "Butter cookies", 990, 75, [snacks], "products/cookies.webp"),
        ("Salted Peanuts 250g", "Roasted peanuts", 890, 65, [snacks], "products/peanuts.webp"),

        # Frozen
        ("Frozen Pizza", "Cheese pizza", 1590, 35, [frozen], "products/frozen_pizza.webp"),
        ("Ice Cream 1L", "Vanilla ice cream", 1890, 30, [frozen], "products/ice_cream.webp"),
        ("Frozen Veg Mix 1kg", "Mixed vegetables", 1290, 50, [frozen], "products/frozen_veg.webp"),
    ]

    for name, desc, price, qty, cats, img_key in products:
        _create_product(name, desc, price, qty, cats, img_key)

    db.session.commit()
    print("✅ Seed complete!")
    print("\nLogin accounts:")
    print("  Admin:    admin@supermart.local / Admin123!")
    print("  Delivery: delivery1@supermart.local / Delivery123!")
    print("  User:     maya@supermart.local / User123!")
