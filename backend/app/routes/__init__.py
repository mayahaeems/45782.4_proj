from .auth_routes import auth_bp
from .user_routes import user_bp
from .product_routes import product_bp
from .category_routes import category_bp
from .cart_routes import cart_bp
from .order_routes import order_bp
from .files_routes import files_bp
from .payment_routes import payment_bp
from .delivery_routes import delivery_bp

def _register_once(app, bp, name=None, url_prefix=None):
    key = name or bp.name
    if key in app.blueprints:
        return
    app.register_blueprint(bp, name=name, url_prefix=url_prefix)

def register_blueprints(app):
    _register_once(app, auth_bp, name="auth_routes_bp")
    _register_once(app, user_bp, name="user_routes_bp")
    _register_once(app, product_bp, name="product_routes_bp")
    _register_once(app, category_bp, name="category_routes_bp")
    _register_once(app, cart_bp, name="cart_routes_bp")
    _register_once(app, order_bp, name="order_routes_bp")
    _register_once(app, files_bp, name="files_routes_bp")
    _register_once(app, payment_bp, name="payment_routes_bp")
    _register_once(app, delivery_bp, name="delivery_routes_bp")
