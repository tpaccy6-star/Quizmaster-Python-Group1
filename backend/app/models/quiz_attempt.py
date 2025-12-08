from datetime import datetime
from enum import Enum as PyEnum
from app import db
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class AttemptStatus(PyEnum):
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    GRADED = "graded"
    AUTO_SUBMITTED = "auto_submitted"


class QuizAttempt(db.Model):
    __tablename__ = 'quiz_attempts'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    quiz_id = db.Column(db.String(36), db.ForeignKey(
        'quizzes.id', ondelete='CASCADE'), nullable=False)
    student_id = db.Column(db.String(36), db.ForeignKey(
        'students.id', ondelete='CASCADE'), nullable=False)
    attempt_number = db.Column(db.Integer, nullable=False, default=1)

    # Lifecycle
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    submitted_at = db.Column(db.DateTime)
    status = db.Column(db.Enum(AttemptStatus), nullable=False,
                       default=AttemptStatus.IN_PROGRESS)

    # Scoring
    score = db.Column(db.Numeric(5, 2))
    total_marks = db.Column(db.Integer)
    percentage = db.Column(db.Numeric(5, 2))
    passed = db.Column(db.Boolean)

    # Anti-cheating
    total_violations = db.Column(db.Integer, default=0)
    auto_submitted_due_to_violations = db.Column(db.Boolean, default=False)

    # Browser info
    ip_address = db.Column(db.String(45))  # IPv6 support
    user_agent = db.Column(db.Text)

    # Attempt reset fields
    is_reset = db.Column(db.Boolean, default=False)
    reset_by = db.Column(db.String(36), db.ForeignKey(
        'teachers.id', ondelete='SET NULL'))
    reset_at = db.Column(db.DateTime)
    reset_reason = db.Column(db.Text)
    original_max_attempts = db.Column(db.Integer)
    additional_attempts_granted = db.Column(db.Integer, default=0)

    # Relationships
    quiz = db.relationship('Quiz', back_populates='attempts')
    student = db.relationship('Student', back_populates='attempts')
    answers = db.relationship(
        'StudentAnswer', back_populates='attempt', cascade='all, delete-orphan')
    violations = db.relationship(
        'Violation', back_populates='attempt', cascade='all, delete-orphan')
    reset_by_teacher = db.relationship('Teacher', foreign_keys=[reset_by])

    __table_args__ = (
        db.UniqueConstraint('quiz_id', 'student_id',
                            'attempt_number', name='unique_attempt'),
    )

    def to_dict(self, include_answers=False):
        data = {
            'id': self.id,
            'quiz_id': self.quiz_id,
            'student_id': self.student_id,
            'attempt_number': self.attempt_number,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'status': self.status.value if isinstance(self.status, PyEnum) else self.status,
            'score': float(self.score) if self.score else None,
            'total_marks': self.total_marks,
            'percentage': float(self.percentage) if self.percentage else None,
            'passed': self.passed,
            'total_violations': self.total_violations,
            'auto_submitted_due_to_violations': self.auto_submitted_due_to_violations,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'is_reset': self.is_reset,
            'reset_by': self.reset_by,
            'reset_at': self.reset_at.isoformat() if self.reset_at else None,
            'reset_reason': self.reset_reason,
            'additional_attempts_granted': self.additional_attempts_granted
        }
        if include_answers:
            data['answers'] = [a.to_dict() for a in self.answers]
        return data

    def __repr__(self):
        return f'<QuizAttempt {self.quiz_id}:{self.student_id}:{self.attempt_number}>'
