from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import random
import string
from app import db
from app.models.user import User, UserRole
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.password_reset_token import PasswordResetToken
from app.models.refresh_token import RefreshToken
from app.utils.decorators import jwt_required_with_role

auth_bp = Blueprint('auth', __name__)


def generate_otp():
    """Generate 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user (admin only for now)"""
    data = request.get_json()

    # Validate required fields
    required_fields = ['email', 'password', 'name', 'role']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400

    # Validate role
    try:
        role = UserRole(data['role'])
    except ValueError:
        return jsonify({'error': 'Invalid role. Must be admin, teacher, or student'}), 400

    # Check if user already exists
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'User with this email already exists'}), 409

    try:
        # Create user
        user = User(
            email=data['email'],
            name=data['name'],
            role=role
        )
        user.set_password(data['password'])

        db.session.add(user)
        db.session.flush()  # Get the user ID

        # Create role-specific profile
        if role == UserRole.TEACHER:
            teacher = Teacher(
                id=user.id,
                subject=data.get('subject'),
                phone=data.get('phone'),
                department=data.get('department'),
                bio=data.get('bio')
            )
            db.session.add(teacher)
        elif role == UserRole.STUDENT:
            student = Student(
                id=user.id,
                registration_number=data.get('registration_number'),
                class_id=data.get('class_id'),
                date_of_birth=datetime.strptime(data['date_of_birth']).date(
                ) if data.get('date_of_birth') else None,
                parent_email=data.get('parent_email'),
                parent_phone=data.get('parent_phone')
            )
            db.session.add(student)

        db.session.commit()

        return jsonify({
            'message': 'User registered successfully',
            'user': user.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Registration failed', 'details': str(e)}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user and return tokens"""
    data = request.get_json()

    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=data['email']).first()

    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid email or password'}), 401

    if not user.is_active:
        return jsonify({'error': 'Account is inactive'}), 401

    # Update last login
    user.last_login = datetime.utcnow()
    db.session.commit()

    # Create tokens
    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)

    # Store refresh token in database
    db_refresh_token = RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=datetime.utcnow() + timedelta(days=30)
    )
    db.session.add(db_refresh_token)
    db.session.commit()

    # Get user data based on role
    user_data = user.to_dict()
    if user.role == UserRole.TEACHER and user.teacher:
        user_data.update(user.teacher.to_dict(include_user=False))
    elif user.role == UserRole.STUDENT and user.student:
        user_data.update(user.student.to_dict(include_user=False))

    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': user_data
    }), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)

    if not user or not user.is_active:
        return jsonify({'error': 'User not found or inactive'}), 401

    new_access_token = create_access_token(identity=current_user_id)

    return jsonify({
        'access_token': new_access_token
    }), 200


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user (revoke refresh token)"""
    current_user_id = get_jwt_identity()
    refresh_token = request.get_json().get('refresh_token')

    if refresh_token:
        # Revoke the refresh token
        db_refresh_token = RefreshToken.query.filter_by(
            token=refresh_token,
            user_id=current_user_id
        ).first()

        if db_refresh_token:
            db_refresh_token.revoke()
            db.session.commit()

    return jsonify({'message': 'Logged out successfully'}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required_with_role()
def get_current_user(current_user):
    """Get current user profile"""
    user_data = current_user.to_dict()

    # Add role-specific data
    if current_user.role == UserRole.TEACHER and current_user.teacher:
        user_data.update(current_user.teacher.to_dict(include_user=False))
    elif current_user.role == UserRole.STUDENT and current_user.student:
        user_data.update(current_user.student.to_dict(include_user=False))

    return jsonify({'user': user_data}), 200


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required_with_role()
def update_profile(current_user):
    """Update user profile"""
    data = request.get_json()

    if 'name' in data:
        current_user.name = data['name']
    if 'email' in data:
        current_user.email = data['email']

    db.session.commit()

    return jsonify({'message': 'Profile updated successfully'}), 200


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Request password reset"""
    data = request.get_json()
    email = data.get('email')

    if not email:
        return jsonify({'error': 'Email is required'}), 400

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({'error': 'User with this email not found'}), 404

    # Invalidate existing tokens
    PasswordResetToken.query.filter_by(
        user_id=user.id, is_used=False).update({'is_used': True})

    # Create new reset token
    token = generate_otp()
    reset_token = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=datetime.utcnow() + timedelta(hours=1)
    )

    db.session.add(reset_token)
    db.session.commit()

    # TODO: Send email with token
    # For now, return the token (remove in production)
    return jsonify({
        'message': 'Password reset token sent to email',
        'token': token  # Remove this in production
    }), 200


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password with token"""
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('new_password')

    if not token or not new_password:
        return jsonify({'error': 'Token and new password are required'}), 400

    reset_token = PasswordResetToken.query.filter_by(token=token).first()

    if not reset_token or not reset_token.is_valid():
        return jsonify({'error': 'Invalid or expired token'}), 400

    user = reset_token.user
    user.set_password(new_password)

    # Mark token as used
    reset_token.is_used = True

    db.session.commit()

    return jsonify({'message': 'Password reset successfully'}), 200


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required_with_role()
def change_password(current_user):
    """Change password for authenticated user"""
    data = request.get_json()
    current_password = data.get('current_password')
    new_password = data.get('new_password')

    if not current_password or not new_password:
        return jsonify({'error': 'Current password and new password are required'}), 400

    if not current_user.check_password(current_password):
        return jsonify({'error': 'Current password is incorrect'}), 400

    current_user.set_password(new_password)
    db.session.commit()

    return jsonify({'message': 'Password changed successfully'}), 200
