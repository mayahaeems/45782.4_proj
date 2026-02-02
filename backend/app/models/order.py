from __future__ import annotations
from datetime import datetime
import enum
from sqlalchemy import CheckConstraint
from ..extensions import db

class OrderPaymentStatus(enum.Enum):
    pending = "pending"
    paid = "paid"
    canceled = "canceled"
    refunded = "refunded"

class DeliveryStatus(enum.Enum):
    pending = "pending"
    processing = "processing"
    assigned = "assigned"
    on_the_way = "on_the_way"
    delivered = "delivered"
    canceled = "canceled"

class PaymentProvider(enum.Enum):
    paypal = "paypal"
    card = "card"

class PaymentStatus(enum.Enum):
    created = "created"
    authorized = "authorized"
    captured = "captured"
    failed = "failed"
    canceled = "canceled"
    refunded = "refunded"
    
class Order(db.Model):
    __tablename__ = "orders"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    # ISO 4217 code (e.g., ILS, USD)
    currency = db.Column(db.String(3), nullable=False, default="ILS")
    # Money in minor units (agorot/cents)
    subtotal_amount = db.Column(db.Integer, nullable=False, default=0)
    shipping_amount = db.Column(db.Integer, nullable=False, default=0)
    discount_amount = db.Column(db.Integer, nullable=False, default=0)
    tax_amount = db.Column(db.Integer, nullable=False, default=0)
    total_amount = db.Column(db.Integer, nullable=False, default=0)
    payment_status = db.Column(
        db.Enum(OrderPaymentStatus, name="order_payment_status_enum"),
        nullable=False,
        default=OrderPaymentStatus.pending,
    )
    delivery_status = db.Column(
        db.Enum(DeliveryStatus, name="delivery_status_enum"),
        nullable=False,
        default=DeliveryStatus.pending,
    )
    address = db.Column(db.String(255), nullable=False)
    phone_number = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
    items = db.relationship(
        "OrderItem",
        backref="order",
        lazy="selectin",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    payments = db.relationship(
        "Payment",
        backref="order",
        lazy="selectin",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    __table_args__ = (
        CheckConstraint("subtotal_amount >= 0", name="ck_orders_subtotal_nonnegative"),
        CheckConstraint("shipping_amount >= 0", name="ck_orders_shipping_nonnegative"),
        CheckConstraint("discount_amount >= 0", name="ck_orders_discount_nonnegative"),
        CheckConstraint("tax_amount >= 0", name="ck_orders_tax_nonnegative"),
        CheckConstraint("total_amount >= 0", name="ck_orders_total_nonnegative"),
    )
    def recalc_totals(self) :
        """Recalculate derived totals from items and modifiers."""
        self.subtotal_amount = 0
        for oi in self.items:
            unit=oi.unit_amount or 0
            qty=oi.quantity or 0
            self.subtotal_amount += unit * qty
        self.total_amount =self.subtotal_amount
    def cancel(self, user) -> tuple[bool, str]:
        """
        Cancel rules:
        - Admin can cancel any order.
        - Regular user can cancel only if delivery_status is before on_the_way.
        """
        if user.is_admin():
            self.delivery_status = DeliveryStatus.canceled
            self.payment_status = OrderPaymentStatus.canceled
            return True, "Order canceled by admin"
        if user.id != self.user_id:
            return False, "Not your order"
        if self.delivery_status in {
            DeliveryStatus.pending,
            DeliveryStatus.processing,
            DeliveryStatus.assigned,
        }:
            self.delivery_status = DeliveryStatus.canceled
            self.payment_status = OrderPaymentStatus.canceled
            return True, "Order canceled"
        return False, "Order cannot be canceled"

class OrderItem(db.Model):
    __tablename__ = "order_items"
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(
        db.Integer,
        db.ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    # Money in minor units (agorot/cents)
    unit_amount = db.Column(db.Integer, nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    __table_args__ = (
        CheckConstraint("unit_amount >= 0", name="ck_order_items_unit_amount_nonnegative"),
        CheckConstraint("quantity >= 1", name="ck_order_items_quantity_positive"),
    )


class Payment(db.Model):
    __tablename__ = "payments"
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(
        db.Integer,
        db.ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider = db.Column(
        db.Enum(PaymentProvider, name="payment_provider_enum"),
        nullable=False,
    )
    status = db.Column(
        db.Enum(PaymentStatus, name="payment_status_enum"),
        nullable=False,
        default=PaymentStatus.created,
    )
    currency = db.Column(db.String(3), nullable=False)
    # Money in minor units (agorot/cents)
    amount = db.Column(db.Integer, nullable=False)
    # PayPal order id / PSP payment id, etc.
    provider_payment_id = db.Column(db.String(128), unique=True, index=True, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    __table_args__ = (
        CheckConstraint("amount >= 0", name="ck_payments_amount_nonnegative"),
    )
