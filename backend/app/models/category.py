from datetime import datetime
from ..extensions import db

class Category(db.Model):
    __tablename__ = "categories"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True, index=True)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    # exactly 1 image
    image = db.relationship(
        "CategoryImage",
        backref="category",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
