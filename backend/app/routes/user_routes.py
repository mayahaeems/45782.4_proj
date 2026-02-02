from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models.user import User, UserRole
from ..schemas.user_schema import (
    UserResponseSchema,
    AdminUserCreateSchema,
    UserUpdateSchema,
    AdminUserUpdateSchema
)

user_bp = Blueprint("users", __name__)

#---helper functions---
def _bad_request(msg: str, code: int = 400):
    return jsonify({"error": msg}), code

def _serialize(user):
    return UserResponseSchema().dump(user)

def _get_current_user():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return None,_bad_request("User not found", 404)
    return user,None

def _admin_required(user):
    if user.role != UserRole.ADMIN:
        return _bad_request("Admin privileges required", 403)
    return None

#---user: self routres---
#get own profile
@user_bp.get("/me")
@jwt_required()
def get_me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return _bad_request("User not found", 404)
    return jsonify(_serialize(user)), 200

#update own profile
@user_bp.put("/me")
@jwt_required()
def update_me():
    user, error = _get_current_user()
    if error:
        return error
    data = request.get_json(silent=True) or {}
    schema = UserUpdateSchema()
    try:
        validated = schema.load(data, partial=True)
    except Exception as e:
        return _bad_request(str(e), 400)
    for key, value in validated.items():
        if key == "password":
            user.set_password(value)
        else:
            setattr(user, key, value)
    db.session.commit()
    return jsonify(_serialize(user)), 200

# Delete own account
@user_bp.delete("/me")
@jwt_required()
def delete_me():
    user, error =_get_current_user()
    if error:
        return error
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "User account deleted"}), 200

#--- Admin & Delivery routes ---
#list all users
@user_bp.get("/")
@jwt_required()
def list_users():
    current_user, error = _get_current_user()
    if error:
        return error
    if current_user.role == UserRole.ADMIN:
        users = User.query.all()
    elif current_user.role == UserRole.DELIVERY:
        # Delivery sees only non-admin users
        users = User.query.filter(User.role != UserRole.ADMIN).all()
    else:
        return _bad_request("Access denied", 403)
    return jsonify(UserResponseSchema(many=True).dump(users)), 200

#get user by id
@user_bp.get("/<int:user_id>")
@jwt_required()
def get_user(user_id):
    current_user, error = _get_current_user()
    if error:
        return error
    user= User.query.get(user_id)
    if not user:
        return _bad_request("User not found", 404)
    # role-based access:
    if current_user.role == UserRole.ADMIN:
        pass  # Admin can access all users
    elif current_user.role == UserRole.DELIVERY:
        if user.role == UserRole.ADMIN:
            return _bad_request("Access denied", 403)
    else:
        return _bad_request("Access denied", 403)
    return jsonify(_serialize(user)), 200

# Admin: Create user with selectable role
@user_bp.post("/")
@jwt_required()
def create_user():
    current_user, error = _get_current_user()
    if error:
        return error
    error =_admin_required(current_user)
    if error:
        return error
    data= request.get_json(silent=True) or {}
    schema = AdminUserCreateSchema()
    try:
        validated = schema.load(data)
    except Exception as e:
        return _bad_request(str(e), 400)
    # Create user object
    user=User(
        full_name=validated['full_name'],
        email=validated['email'].strip().lower(),
        role=UserRole(validated['role']),
        default_phone=validated['default_phone'],
        default_address=validated.get('default_address')
    )
    user.set_password(validated['password'])
    db.session.add(user)
    db.session.commit()
    return jsonify(_serialize(user)), 201

# Admin: Update user (including role)
@user_bp.put("/<int:user_id>")
@jwt_required()
def update_user(user_id):
    current_user, error = _get_current_user()
    if error:
        return error
    user= User.query.get(user_id)
    if not user:
        return _bad_request("User not found", 404)
    data = request.get_json(silent=True) or {}
    schema = AdminUserUpdateSchema()
    try:
        validated = schema.load(data, partial=True)
    except Exception as e:
        return _bad_request(str(e), 400)
    for key, value in validated.items():
        if key == "password":
            user.set_password(value)
        elif key == "role":
            user.role = UserRole(value)
        else:
            setattr(user, key, value)
    db.session.commit()
    return jsonify(_serialize(user)), 200

# Admin: Delete user
@user_bp.delete("/<int:user_id>")
@jwt_required()
def delete_user(user_id):
    current_user, error = _get_current_user()
    if error:
        return error
    error = _admin_required(current_user)
    if error:
        return error
    user= User.query.get(user_id)
    if not user:
        return _bad_request("User not found", 404)
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "User deleted"}), 200