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

    # ISO 4217 currency code
    currency = db.Column(db.String(3), nullable=False, default="ILS")

    # All money in minor units (agorot/cents)
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

    # delivery person assigned to this order (nullable — set when assigned)
    delivery_user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    # who placed the order
    user = db.relationship(
        "User",
        foreign_keys=[user_id],  # explicit — two FKs to users
        backref="orders",
        lazy="selectin",
    )

    # who delivers the order
    delivery_user = db.relationship(
        "User",
        foreign_keys="Order.delivery_user_id",
        backref="assigned_orders",
        lazy="selectin",
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
        CheckConstraint("tax_amount >= 0",      name="ck_orders_tax_nonnegative"),
        CheckConstraint("total_amount >= 0",    name="ck_orders_total_nonnegative"),
    )
    def recalc_totals(self) -> None:
        """Recalculate subtotal and total from order items."""
        self.subtotal_amount = sum(
            (oi.unit_amount or 0) * (oi.quantity or 0)
            for oi in self.items
        )
        self.total_amount = (
            self.subtotal_amount
            + (self.shipping_amount or 0)
            + (self.tax_amount or 0)
            - (self.discount_amount or 0)
        )
        
    def cancel(self, user) -> tuple[bool, str]:
        """
        Cancel rules:
        - Admin can cancel any order.
        - User can cancel only if delivery hasn't started (before on_the_way).
        """
        if user.is_admin():
            self.delivery_status = DeliveryStatus.canceled
            self.payment_status = OrderPaymentStatus.canceled
            return True, "Order canceled by admin"

        if user.id != self.user_id:
            return False, "Not your order"

        cancelable = {
            DeliveryStatus.pending,
            DeliveryStatus.processing,
            DeliveryStatus.assigned,
        }
        if self.delivery_status in cancelable:
            self.delivery_status = DeliveryStatus.canceled
            self.payment_status = OrderPaymentStatus.canceled
            return True, "Order canceled"

        return False, "Order cannot be canceled at this stage"

    def __repr__(self) -> str:
        return f"<Order id={self.id} user_id={self.user_id} total={self.total_amount}>"


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
    unit_amount = db.Column(db.Integer, nullable=False)  # snapshot price
    quantity = db.Column(db.Integer, nullable=False)
    product = db.relationship('Product', lazy='joined', foreign_keys=[product_id])
    __table_args__ = (
        CheckConstraint("unit_amount >= 0", name="ck_order_items_unit_amount_nonnegative"),
        CheckConstraint("quantity >= 1",    name="ck_order_items_quantity_positive"),
    )

    @property
    def line_total(self) -> int:
        return self.unit_amount * self.quantity

    def __repr__(self) -> str:
        return f"<OrderItem id={self.id} order_id={self.order_id} product_id={self.product_id}>"


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
    amount = db.Column(db.Integer, nullable=False)  # minor units
    provider_payment_id = db.Column(
        db.String(128),
        unique=True,
        index=True,
        nullable=True,
    )
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("amount >= 0", name="ck_payments_amount_nonnegative"),
    )

    def __repr__(self) -> str:
        return f"<Payment id={self.id} order_id={self.order_id} status={self.status.value}>"
