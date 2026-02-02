from datetime import datetime
import enum
from werkzeug.security import generate_password_hash, check_password_hash
from ..extensions import db

class UserRole(enum.Enum):
    USER = "user"
    ADMIN = "admin"
    DELIVERY = "delivery"

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum(UserRole, name="user_roles"), nullable=False, default=UserRole.USER)
    default_address = db.Column(db.String(255), nullable=True)
    default_phone = db.Column(db.String(20), nullable=False)
    # ONE image per user: store key/url (NULL => default avatar in config)
    profile_image_key = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    carts = db.relationship("Cart", backref="user", lazy=True)
    orders = db.relationship("Order", backref="user", lazy=True)
    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)
    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)
    def is_admin(self) -> bool:
        return self.role == UserRole.ADMIN
    def is_delivery(self) -> bool:
        return self.role == UserRole.DELIVERY

