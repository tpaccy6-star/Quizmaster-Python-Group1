from datetime import datetime
from enum import Enum as PyEnum
from app import db
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class UserRole(PyEnum):
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum(UserRole), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    is_email_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = db.Column(db.DateTime)

    # Relationships
    teacher = db.relationship(
        'Teacher', back_populates='user', uselist=False, cascade='all, delete-orphan')
    student = db.relationship(
        'Student', back_populates='user', uselist=False, cascade='all, delete-orphan')
    refresh_tokens = db.relationship(
        'RefreshToken', back_populates='user', cascade='all, delete-orphan')
    password_reset_tokens = db.relationship(
        'PasswordResetToken', back_populates='user', cascade='all, delete-orphan')
    notifications = db.relationship(
        'Notification', back_populates='user', cascade='all, delete-orphan')
    audit_logs = db.relationship(
        'AuditLog', back_populates='user', cascade='all, delete-orphan')

    def set_password(self, password):
        from app import bcrypt
        self.password_hash = bcrypt.generate_password_hash(
            password).decode('utf-8')

    def check_password(self, password):
        from app import bcrypt
        return bcrypt.check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'role': self.role.value if isinstance(self.role, PyEnum) else self.role,
            'is_active': self.is_active,
            'is_email_verified': self.is_email_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }

    def __repr__(self):
        return f'<User {self.email}>'
