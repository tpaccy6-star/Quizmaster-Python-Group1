from datetime import datetime
from enum import Enum as PyEnum
from app import db
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class ViolationType(PyEnum):
    TAB_SWITCH = "tab_switch"
    FULLSCREEN_EXIT = "fullscreen_exit"
    COPY_ATTEMPT = "copy_attempt"
    PASTE_ATTEMPT = "paste_attempt"
    RIGHT_CLICK = "right_click"
    FOCUS_LOST = "focus_lost"
    MULTIPLE_WINDOWS = "multiple_windows"


class Violation(db.Model):
    __tablename__ = 'violations'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    attempt_id = db.Column(db.String(36), db.ForeignKey(
        'quiz_attempts.id', ondelete='CASCADE'), nullable=False)
    violation_type = db.Column(db.Enum(ViolationType), nullable=False)
    detected_at = db.Column(db.DateTime, default=datetime.utcnow)
    question_index = db.Column(db.Integer)
    severity = db.Column(db.String(20))  # low, medium, high
    extra_data = db.Column(db.JSON)  # Additional details about the violation

    # Relationships
    attempt = db.relationship('QuizAttempt', back_populates='violations')

    def to_dict(self):
        return {
            'id': self.id,
            'attempt_id': self.attempt_id,
            'violation_type': self.violation_type.value if isinstance(self.violation_type, PyEnum) else self.violation_type,
            'detected_at': self.detected_at.isoformat() if self.detected_at else None,
            'question_index': self.question_index,
            'severity': self.severity,
            'extra_data': self.extra_data
        }

    def __repr__(self):
        return f'<Violation {self.violation_type.value if isinstance(self.violation_type, PyEnum) else self.violation_type}>'
