from datetime import datetime
from app import db
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey(
        'users.id', ondelete='CASCADE'), nullable=False)
    type = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    link = db.Column(db.String(500))
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    read_at = db.Column(db.DateTime)

    # Enhanced fields
    priority = db.Column(db.String(20), default='medium')  # low, medium, high
    # quiz, grade, system, attempt_reset, violation
    category = db.Column(db.String(50), default='system')
    action_url = db.Column(db.String(500))
    expires_at = db.Column(db.DateTime)
    extra_data = db.Column(db.JSON)  # Renamed from metadata

    # Relationships
    user = db.relationship('User', back_populates='notifications')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'type': self.type,
            'title': self.title,
            'message': self.message,
            'link': self.link,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'priority': self.priority,
            'category': self.category,
            'action_url': self.action_url,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'extra_data': self.extra_data
        }

    def __repr__(self):
        return f'<Notification {self.title}>'
