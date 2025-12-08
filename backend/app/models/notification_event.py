from datetime import datetime
from app import db
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class NotificationEvent(db.Model):
    __tablename__ = 'notification_events'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    event_type = db.Column(db.String(100), nullable=False)
    entity_type = db.Column(db.String(50), nullable=False)
    entity_id = db.Column(db.String(36), nullable=False)
    triggered_by = db.Column(db.String(36), db.ForeignKey(
        'users.id', ondelete='SET NULL'))
    # Array of user IDs who should be notified
    recipients = db.Column(db.JSON, nullable=False)
    notification_template = db.Column(db.String(100), nullable=False)
    extra_data = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    processed = db.Column(db.Boolean, default=False)
    processed_at = db.Column(db.DateTime)

    # Relationships
    trigger_user = db.relationship('User', foreign_keys=[triggered_by])

    def to_dict(self):
        return {
            'id': self.id,
            'event_type': self.event_type,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'triggered_by': self.triggered_by,
            'recipients': self.recipients,
            'notification_template': self.notification_template,
            'extra_data': self.extra_data,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'processed': self.processed,
            'processed_at': self.processed_at.isoformat() if self.processed_at else None
        }

    def __repr__(self):
        return f'<NotificationEvent {self.event_type}>'
