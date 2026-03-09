from datetime import datetime
from ..extensions import db


product_categories = db.Table(
    "product_categories",
    db.Column(
        "product_id",
        db.Integer,
        db.ForeignKey("products.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    db.Column(
        "category_id",
        db.Integer,
        db.ForeignKey("categories.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False, index=True)
    description = db.Column(db.Text, nullable=True)

    # money in minor units (agorot). e.g. 1290 = ₪12.90
    price_amount = db.Column(db.Integer, nullable=False)
    currency = db.Column(db.String(3), nullable=False, default="ILS")
    quantity = db.Column(db.Integer, nullable=False, default=0)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    # Many-to-many with categories
    categories = db.relationship(
        "Category",
        secondary=product_categories,
        backref=db.backref("products", lazy=True),
    )

    # All images for this product
    images = db.relationship(
        "ProductImage",
        backref="product",
        lazy=True,
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys="ProductImage.product_id",
    )

    # MySQL-friendly main image pointer (nullable FK, set after flush)
    main_image_id = db.Column(
        db.Integer,
        db.ForeignKey("product_images.id", ondelete="SET NULL"),
        nullable=True,
    )
    main_image = db.relationship(
        "ProductImage",
        foreign_keys=[main_image_id],
        post_update=True,
    )

    # inventory audit logs
    inventory_logs = db.relationship(
        "InventoryLog",
        backref="product",
        lazy=True,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return f"<Product id={self.id} name={self.name} price={self.price_amount}>"
