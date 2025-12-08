from datetime import datetime
from app import db
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class StudentAnswer(db.Model):
    __tablename__ = 'student_answers'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    attempt_id = db.Column(db.String(36), db.ForeignKey(
        'quiz_attempts.id', ondelete='CASCADE'), nullable=False)
    question_id = db.Column(db.String(36), db.ForeignKey(
        'questions.id', ondelete='CASCADE'), nullable=False)

    # Answer (polymorphic based on question type)
    answer_text = db.Column(db.Text)  # For descriptive, short answer
    answer_option = db.Column(db.Integer)  # For MCQ, true/false

    # Grading
    marks_awarded = db.Column(db.Numeric(5, 2))
    feedback = db.Column(db.Text)
    graded_by = db.Column(db.String(36), db.ForeignKey(
        'teachers.id', ondelete='SET NULL'))
    graded_at = db.Column(db.DateTime)

    # Auto-save support
    is_final = db.Column(db.Boolean, default=False)
    answered_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    attempt = db.relationship('QuizAttempt', back_populates='answers')
    question = db.relationship('Question', back_populates='student_answers')
    graded_by_teacher = db.relationship('Teacher', foreign_keys=[graded_by])

    def to_dict(self):
        return {
            'id': self.id,
            'attempt_id': self.attempt_id,
            'question_id': self.question_id,
            'answer_text': self.answer_text,
            'answer_option': self.answer_option,
            'marks_awarded': float(self.marks_awarded) if self.marks_awarded else None,
            'feedback': self.feedback,
            'graded_by': self.graded_by,
            'graded_at': self.graded_at.isoformat() if self.graded_at else None,
            'is_final': self.is_final,
            'answered_at': self.answered_at.isoformat() if self.answered_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<StudentAnswer {self.attempt_id}:{self.question_id}>'
