from functools import wraps
from flask import jsonify, current_app, request
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
from app.models.user import User, UserRole


def jwt_required_with_role():
    """Decorator to require JWT authentication and return current user"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                if request.method == 'OPTIONS':
                    return '', 204
                verify_jwt_in_request()
                user_id = get_jwt_identity()
                current_user = User.query.get(user_id)

                if not current_user or not current_user.is_active:
                    return jsonify({'error': 'User not found or inactive'}), 401

                return f(current_user, *args, **kwargs)
            except Exception as e:
                return jsonify({'error': 'Invalid token'}), 401
        return decorated_function
    return decorator


def require_role(*allowed_roles):
    """Decorator to require specific user roles"""
    def decorator(f):
        @wraps(f)
        def decorated_function(current_user, *args, **kwargs):
            if current_user.role not in allowed_roles:
                return jsonify({'error': 'Insufficient permissions'}), 403
            return f(current_user, *args, **kwargs)
        return decorated_function
    return decorator


def admin_required(f):
    """Decorator to require admin role"""
    return jwt_required_with_role()(require_role(UserRole.ADMIN)(f))


def teacher_required(f):
    """Decorator to require teacher role"""
    return jwt_required_with_role()(require_role(UserRole.TEACHER)(f))


def student_required(f):
    """Decorator to require student role"""
    return jwt_required_with_role()(require_role(UserRole.STUDENT)(f))


def admin_or_teacher_required(f):
    """Decorator to require admin or teacher role"""
    return jwt_required_with_role()(require_role(UserRole.ADMIN, UserRole.TEACHER)(f))


def admin_or_student_required(f):
    """Decorator to require admin or student role"""
    return jwt_required_with_role()(require_role(UserRole.ADMIN, UserRole.STUDENT)(f))


def teacher_or_student_required(f):
    """Decorator to require teacher or student role"""
    return jwt_required_with_role()(require_role(UserRole.TEACHER, UserRole.STUDENT)(f))
