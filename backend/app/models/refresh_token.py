from datetime import datetime
from app import db
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class RefreshToken(db.Model):
    __tablename__ = 'refresh_tokens'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey(
        'users.id', ondelete='CASCADE'), nullable=False)
    token = db.Column(db.String(500), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    revoked_at = db.Column(db.DateTime)
    is_revoked = db.Column(db.Boolean, default=False)

    # Relationships
    user = db.relationship('User', back_populates='refresh_tokens')

    def is_expired(self):
        return datetime.utcnow() > self.expires_at

    def is_valid(self):
        return not self.is_revoked and not self.is_expired()

    def revoke(self):
        self.is_revoked = True
        self.revoked_at = datetime.utcnow()

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'token': self.token,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'revoked_at': self.revoked_at.isoformat() if self.revoked_at else None,
            'is_revoked': self.is_revoked
        }

    def __repr__(self):
        return f'<RefreshToken {self.user_id}>'
