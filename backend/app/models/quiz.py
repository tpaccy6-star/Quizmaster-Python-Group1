from datetime import datetime
from enum import Enum as PyEnum
from app import db
import uuid


def generate_uuid():
    return str(uuid.uuid4())


def generate_access_code():
    import random
    import string
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


class QuizStatus(PyEnum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


# Association table for quiz-class many-to-many relationship
quiz_classes = db.Table('quiz_classes',
                        db.Column('id', db.String(36),
                                  primary_key=True, default=generate_uuid),
                        db.Column('quiz_id', db.String(36), db.ForeignKey(
                            'quizzes.id', ondelete='CASCADE'), nullable=False),
                        db.Column('class_id', db.String(36), db.ForeignKey(
                            'classes.id', ondelete='CASCADE'), nullable=False),
                        db.Column('assigned_at', db.DateTime,
                                  default=datetime.utcnow)
                        )


class Quiz(db.Model):
    __tablename__ = 'quizzes'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    title = db.Column(db.String(255), nullable=False)
    subject = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    access_code = db.Column(db.String(6), unique=True,
                            nullable=False, default=generate_access_code)
    time_limit_minutes = db.Column(db.Integer, nullable=False)
    status = db.Column(db.Enum(QuizStatus), nullable=False,
                       default=QuizStatus.DRAFT, index=True)
    start_date = db.Column(db.DateTime)
    end_date = db.Column(db.DateTime)
    created_by = db.Column(db.String(36), db.ForeignKey(
        'teachers.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Settings
    passing_percentage = db.Column(db.Integer, default=40)
    max_attempts = db.Column(db.Integer, default=1)
    show_answers_after_submission = db.Column(db.Boolean, default=False)
    randomize_questions = db.Column(db.Boolean, default=False)
    randomize_options = db.Column(db.Boolean, default=False)
    allow_review = db.Column(db.Boolean, default=True)

    # Relationships
    creator = db.relationship(
        'Teacher', back_populates='quizzes', foreign_keys=[created_by])
    classes = db.relationship(
        'Class', secondary=quiz_classes, back_populates='quizzes')
    questions = db.relationship(
        'QuizQuestion', back_populates='quiz', cascade='all, delete-orphan')
    attempts = db.relationship(
        'QuizAttempt', back_populates='quiz', cascade='all, delete-orphan')

    def to_dict(self, include_questions=False, include_classes=False):
        data = {
            'id': self.id,
            'title': self.title,
            'subject': self.subject,
            'description': self.description,
            'access_code': self.access_code,
            'time_limit_minutes': self.time_limit_minutes,
            'status': self.status.value if isinstance(self.status, PyEnum) else self.status,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'passing_percentage': self.passing_percentage,
            'max_attempts': self.max_attempts,
            'show_answers_after_submission': self.show_answers_after_submission,
            'randomize_questions': self.randomize_questions,
            'randomize_options': self.randomize_options,
            'allow_review': self.allow_review
        }
        if include_questions:
            data['questions'] = [qq.to_dict() for qq in self.questions]
        if include_classes:
            data['classes'] = [c.to_dict() for c in self.classes]
            data['class_ids'] = [c.id for c in self.classes]
        return data

    def __repr__(self):
        return f'<Quiz {self.title}>'
