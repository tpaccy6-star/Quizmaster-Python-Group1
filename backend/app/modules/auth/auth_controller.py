# Authentication Controller
# Module Owner: Student 1 - Authentication Specialist

# Handles HTTP requests for authentication endpoints

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.modules.auth.auth_service import AuthService
from app.utils.decorators import jwt_required_with_role

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['email', 'password', 'name', 'role']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400

        user = AuthService.register_user(
            email=data['email'],
            password=data['password'],
            name=data['name'],
            role=data['role'],
            **{k: v for k, v in data.items() if k not in required_fields}
        )

        return jsonify({
            'message': 'User registered successfully',
            'user': user.to_dict()
        }), 201

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Registration failed', 'details': str(e)}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user and return tokens"""
    try:
        data = request.get_json()

        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password are required'}), 400

        result = AuthService.authenticate_user(data['email'], data['password'])

        # Get user data based on role
        user_data = result['user'].to_dict()
        from app.models.user import UserRole
        if result['user'].role == UserRole.TEACHER and result['user'].teacher:
            user_data.update(
                result['user'].teacher.to_dict(include_user=False))
        elif result['user'].role == UserRole.STUDENT and result['user'].student:
            user_data.update(
                result['user'].student.to_dict(include_user=False))

        response_data = {
            'access_token': result['access_token'],
            'refresh_token': result['refresh_token'],
            'user': user_data
        }
        return jsonify(response_data), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 401


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    try:
        current_user_id = get_jwt_identity()
        access_token = AuthService.refresh_access_token(current_user_id)

        return jsonify({'access_token': access_token}), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 401


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user"""
    try:
        current_user_id = get_jwt_identity()
        refresh_token = request.get_json().get('refresh_token')

        AuthService.logout_user(current_user_id, refresh_token)

        return jsonify({'message': 'Logged out successfully'}), 200

    except Exception as e:
        return jsonify({'error': 'Logout failed', 'details': str(e)}), 500


@auth_bp.route('/me', methods=['GET'])
@jwt_required_with_role()
def get_current_user(current_user):
    """Get current user profile"""
    from app.models.user import UserRole

    user_data = current_user.to_dict()

    # Add role-specific data
    if current_user.role == UserRole.TEACHER and current_user.teacher:
        user_data.update(current_user.teacher.to_dict(include_user=False))
    elif current_user.role == UserRole.STUDENT and current_user.student:
        user_data.update(current_user.student.to_dict(include_user=False))

    return jsonify({'user': user_data}), 200


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Request password reset"""
    try:
        data = request.get_json()
        email = data.get('email')

        if not email:
            return jsonify({'error': 'Email is required'}), 400

        AuthService.request_password_reset(email)

        return jsonify({
            'message': 'Password reset token sent to email'
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': 'Failed to send email. Please try again later.'}), 500


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password with token"""
    try:
        data = request.get_json()
        token = data.get('token')
        new_password = data.get('new_password')

        if not token or not new_password:
            return jsonify({'error': 'Token and new password are required'}), 400

        AuthService.reset_password(token, new_password)

        return jsonify({'message': 'Password reset successfully'}), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required_with_role()
def change_password(current_user):
    """Change password for authenticated user"""
    try:
        data = request.get_json()
        current_password = data.get('current_password')
        new_password = data.get('new_password')

        if not current_password or not new_password:
            return jsonify({'error': 'Current password and new password are required'}), 400

        AuthService.change_password(
            current_user.id, current_password, new_password)

        return jsonify({'message': 'Password changed successfully'}), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400


@auth_bp.route('/profile', methods=['GET'])
@jwt_required_with_role()
def get_profile(current_user):
    """Get current user profile"""
    user_data = current_user.to_dict()
    return jsonify(user_data), 200


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required_with_role()
def update_profile(current_user):
    """Update user profile"""
    data = request.get_json()

    try:
        AuthService.update_profile(current_user.id, data)
        return jsonify({'message': 'Profile updated successfully'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400


@auth_bp.route('/profile', methods=['OPTIONS'])
def handle_profile_options():
    """Handle OPTIONS request for profile endpoint"""
    return '', 200
