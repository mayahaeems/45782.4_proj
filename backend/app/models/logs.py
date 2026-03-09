from datetime import datetime
import enum
from ..extensions import db


class InventoryChangeType(enum.Enum):
    """Types of inventory changes an admin can make."""
    restock       = "restock"        # added stock
    adjustment    = "adjustment"     # manual correction
    price_change  = "price_change"   # price updated
    activated     = "activated"      # product set active
    deactivated   = "deactivated"    # product set inactive
    name_change   = "name_change"    # product name updated
    description   = "description"    # description updated


class CategoryChangeType(enum.Enum):
    """Types of changes an admin can make to a category."""
    created       = "created"
    name_change   = "name_change"
    description   = "description"
    image_change  = "image_change"
    deleted       = "deleted"
    product_added = "product_added"
    product_removed = "product_removed"


class InventoryLog(db.Model):
    """
    Table I — Tracks every admin change to a product.
    Records what changed, who changed it, old value, new value.
    """
    __tablename__ = "inventory_logs"

    id = db.Column(db.Integer, primary_key=True)

    # Who made the change (admin user)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,   # keep log even if admin is deleted
        index=True,
    )

    # Which product was changed
    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # What kind of change
    change_type = db.Column(
        db.Enum(InventoryChangeType, name="inventory_change_type_enum"),
        nullable=False,
    )

    # Before and after values (stored as strings for flexibility)
    old_value = db.Column(db.String(500), nullable=True)
    new_value = db.Column(db.String(500), nullable=True)

    # Optional note from admin
    note = db.Column(db.String(255), nullable=True)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self) -> str:
        return (
            f"<InventoryLog id={self.id} "
            f"product_id={self.product_id} "
            f"change={self.change_type.value}>"
        )


class CategoryLog(db.Model):
    """
    Table J — Tracks every admin change to a category.
    Records what changed, who changed it, old value, new value.
    """
    __tablename__ = "category_logs"

    id = db.Column(db.Integer, primary_key=True)

    # Which category was changed
    category_id = db.Column(
        db.Integer,
        db.ForeignKey("categories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Who made the change (admin user)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,   # keep log even if admin is deleted
        index=True,
    )

    # What kind of change
    change_type = db.Column(
        db.Enum(CategoryChangeType, name="category_change_type_enum"),
        nullable=False,
    )

    # Before and after values
    old_value = db.Column(db.String(500), nullable=True)
    new_value = db.Column(db.String(500), nullable=True)

    # Optional note from admin
    note = db.Column(db.String(255), nullable=True)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self) -> str:
        return (
            f"<CategoryLog id={self.id} "
            f"category_id={self.category_id} "
            f"change={self.change_type.value}>"
        )
