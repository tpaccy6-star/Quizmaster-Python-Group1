from datetime import datetime
from enum import Enum as PyEnum
from app import db
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class QuestionType(PyEnum):
    MCQ = "mcq"
    DESCRIPTIVE = "descriptive"
    TRUE_FALSE = "true_false"
    SHORT_ANSWER = "short_answer"


class Difficulty(PyEnum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class Question(db.Model):
    __tablename__ = 'questions'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    text = db.Column(db.Text, nullable=False)
    type = db.Column(db.Enum(QuestionType), nullable=False, index=True)
    topic = db.Column(db.String(100), index=True)
    difficulty = db.Column(db.Enum(Difficulty), index=True)
    marks = db.Column(db.Integer, nullable=False)
    created_by = db.Column(db.String(36), db.ForeignKey(
        'teachers.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # MCQ fields
    options = db.Column(db.JSON)  # List of options for MCQ
    correct_answer = db.Column(db.Integer)  # Index of correct option for MCQ

    # Descriptive fields
    sample_answer = db.Column(db.Text)
    marking_rubric = db.Column(db.Text)

    # Relationships
    creator = db.relationship('Teacher', back_populates='questions')
    quizzes = db.relationship('QuizQuestion', back_populates='question')
    student_answers = db.relationship(
        'StudentAnswer', back_populates='question')

    def to_dict(self):
        return {
            'id': self.id,
            'text': self.text,
            'type': self.type.value if isinstance(self.type, PyEnum) else self.type,
            'topic': self.topic,
            'difficulty': self.difficulty.value if isinstance(self.difficulty, PyEnum) else self.difficulty,
            'marks': self.marks,
            'options': self.options,
            'correct_answer': self.correct_answer,
            'sample_answer': self.sample_answer,
            'marking_rubric': self.marking_rubric,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<Question {self.text[:50]}...>'
