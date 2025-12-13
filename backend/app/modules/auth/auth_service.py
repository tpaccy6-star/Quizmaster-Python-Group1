# Authentication Service
# Module Owner: Student 1 - Authentication Specialist


# Handles all authentication business logic

import random
import string
from datetime import datetime, timedelta
from flask_jwt_extended import create_access_token, create_refresh_token
from flask_mail import Message
from app import db, mail
from app.models.user import User, UserRole
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.password_reset_token import PasswordResetToken
from app.models.refresh_token import RefreshToken


class AuthService:

    @staticmethod
    def generate_otp():
        """Generate 6-digit OTP for password reset"""
        return ''.join(random.choices(string.digits, k=6))

    @staticmethod
    def register_user(email, password, name, role, **kwargs):
        """Register a new user with role-specific data"""
        # Validate role
        try:
            user_role = UserRole(role)
        except ValueError:
            raise ValueError(
                'Invalid role. Must be admin, teacher, or student')

        # Check if user exists
        if User.query.filter_by(email=email).first():
            raise ValueError('User with this email already exists')

        # Create user
        user = User(email=email, name=name, role=user_role)
        user.set_password(password)

        db.session.add(user)
        db.session.flush()  # Get user ID

        # Create role-specific profile
        if user_role == UserRole.TEACHER:
            teacher = Teacher(
                id=user.id,
                subject=kwargs.get('subject'),
                phone=kwargs.get('phone'),
                department=kwargs.get('department'),
                bio=kwargs.get('bio')
            )
            db.session.add(teacher)
        elif user_role == UserRole.STUDENT:
            student = Student(
                id=user.id,
                registration_number=kwargs.get('registration_number'),
                class_id=kwargs.get('class_id'),
                date_of_birth=datetime.strptime(kwargs['date_of_birth']).date(
                ) if kwargs.get('date_of_birth') else None,
                parent_email=kwargs.get('parent_email'),
                parent_phone=kwargs.get('parent_phone')
            )
            db.session.add(student)

        db.session.commit()
        return user

    @staticmethod
    def authenticate_user(email, password):
        """Authenticate user and return tokens"""
        user = User.query.filter_by(email=email).first()

        if not user or not user.check_password(password):
            raise ValueError('Invalid email or password')

        if not user.is_active:
            raise ValueError('Account is inactive')

        # Update last login
        user.last_login = datetime.utcnow()
        db.session.commit()

        # Create tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)

        # Store refresh token
        db_refresh_token = RefreshToken(
            user_id=user.id,
            token=refresh_token,
            expires_at=datetime.utcnow() + timedelta(days=30)
        )
        db.session.add(db_refresh_token)
        db.session.commit()

        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user
        }

    @staticmethod
    def refresh_access_token(user_id):
        """Refresh access token"""
        user = User.query.get(user_id)
        if not user or not user.is_active:
            raise ValueError('User not found or inactive')

        return create_access_token(identity=user_id)

    @staticmethod
    def logout_user(user_id, refresh_token):
        """Logout user by revoking refresh token"""
        if refresh_token:
            db_refresh_token = RefreshToken.query.filter_by(
                token=refresh_token,
                user_id=user_id
            ).first()

            if db_refresh_token:
                db_refresh_token.revoke()
                db.session.commit()

    @staticmethod
    def request_password_reset(email):
        """Request password reset with OTP"""
        user = User.query.filter_by(email=email).first()
        if not user:
            raise ValueError('User with this email not found')

        # Invalidate existing tokens
        PasswordResetToken.query.filter_by(
            user_id=user.id, is_used=False).update({'is_used': True})

        # Create new reset token
        token = AuthService.generate_otp()
        reset_token = PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=datetime.utcnow() + timedelta(hours=1)
        )

        db.session.add(reset_token)
        db.session.commit()

        # Send email with token
        try:
            msg = Message(
                subject='Password Reset Token',
                sender=None,  # Uses MAIL_USERNAME from config
                recipients=[email],
                body=f'Your password reset token is: {token}\n\nThis token will expire in 1 hour.'
            )
            mail.send(msg)
        except Exception as e:
            # Re-raise to be handled by controller, or log and suppress
            raise Exception(f"Failed to send email: {str(e)}")

        return token  # Kept for reference, but controller should not expose it

    @staticmethod
    def reset_password(token, new_password):
        """Reset password using token"""
        reset_token = PasswordResetToken.query.filter_by(token=token).first()

        if not reset_token or not reset_token.is_valid():
            raise ValueError('Invalid or expired token')

        user = reset_token.user
        user.set_password(new_password)

        reset_token.is_used = True
        db.session.commit()

    @staticmethod
    def change_password(user_id, current_password, new_password):
        """Change password for authenticated user"""
        user = User.query.get(user_id)
        if not user.check_password(current_password):
            raise ValueError('Current password is incorrect')

        user.set_password(new_password)
        db.session.commit()

    @staticmethod
    def update_profile(user_id, data):
        """Update user profile information"""
        user = User.query.get(user_id)

        if not user:
            raise ValueError('User not found')

        # Update allowed fields
        allowed_fields = ['name', 'email', 'phone']
        for field in allowed_fields:
            if field in data:
                setattr(user, field, data[field])

        db.session.commit()
