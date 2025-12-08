from datetime import datetime
from app import db
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class AttemptHistory(db.Model):
    __tablename__ = 'attempt_history'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    quiz_id = db.Column(db.String(36), db.ForeignKey(
        'quizzes.id', ondelete='CASCADE'), nullable=False)
    student_id = db.Column(db.String(36), db.ForeignKey(
        'students.id', ondelete='CASCADE'), nullable=False)
    attempt_number = db.Column(db.Integer, nullable=False)
    # in_progress, submitted, graded, auto_submitted
    status = db.Column(db.String(50), nullable=False)
    score = db.Column(db.Numeric(5, 2))
    total_marks = db.Column(db.Integer)
    percentage = db.Column(db.Numeric(5, 2))
    total_violations = db.Column(db.Integer, default=0)
    auto_submitted_due_to_violations = db.Column(db.Boolean, default=False)
    started_at = db.Column(db.DateTime, nullable=False)
    submitted_at = db.Column(db.DateTime)
    archived_at = db.Column(db.DateTime, default=datetime.utcnow)
    # False when attempt is reset
    is_active = db.Column(db.Boolean, default=True)

    # Relationships
    quiz = db.relationship('Quiz')
    student = db.relationship('Student')

    def to_dict(self):
        return {
            'id': self.id,
            'quiz_id': self.quiz_id,
            'student_id': self.student_id,
            'attempt_number': self.attempt_number,
            'status': self.status,
            'score': float(self.score) if self.score else None,
            'total_marks': self.total_marks,
            'percentage': float(self.percentage) if self.percentage else None,
            'total_violations': self.total_violations,
            'auto_submitted_due_to_violations': self.auto_submitted_due_to_violations,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'archived_at': self.archived_at.isoformat() if self.archived_at else None,
            'is_active': self.is_active
        }

    def __repr__(self):
        return f'<AttemptHistory {self.quiz_id}:{self.student_id}:{self.attempt_number}>'
