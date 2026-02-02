from datetime import datetime
import enum
from sqlalchemy import UniqueConstraint, CheckConstraint
from sqlalchemy.exc import IntegrityError
from ..extensions import db

class CartStatus(enum.Enum):
    active = "active"
    converted = "converted"
    abandoned = "abandoned"

class Cart(db.Model):
    __tablename__ = "carts"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = db.Column(db.Enum(CartStatus, name="cart_status_enum"), nullable=False, default=CartStatus.active)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    items = db.relationship(
        "CartItem",
        backref="cart",
        lazy=True,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    __table_args__ = (
        UniqueConstraint("user_id", "status", name="uq_user_cart_status"),
    )
    @staticmethod
    def get_or_create_active(user_id: int) -> "Cart":
        cart = Cart.query.filter_by(user_id=user_id, status=CartStatus.active).first()
        if cart:
            return cart
        cart = Cart(user_id=user_id, status=CartStatus.active)
        db.session.add(cart)
        try:
            db.session.flush()
        except IntegrityError:
            db.session.rollback()
            cart = Cart.query.filter_by(user_id=user_id, status=CartStatus.active).first()
            if not cart:
                raise
        return cart

class CartItem(db.Model):
    __tablename__ = "cart_items"
    id = db.Column(db.Integer, primary_key=True)
    cart_id = db.Column(db.Integer, db.ForeignKey("carts.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True)
    quantity = db.Column(db.Integer, nullable=False)
    unit_amount = db.Column(db.Integer, nullable=False)  # snapshot price
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    __table_args__ = (
        UniqueConstraint("cart_id", "product_id", name="uq_cart_product"),
        CheckConstraint("quantity >= 1", name="ck_cart_item_quantity_positive"),
        CheckConstraint("unit_amount >= 0", name="ck_cart_item_unit_amount_nonnegative"),
    )
    def line_total(self) -> int:
        return self.unit_amount * self.quantity
