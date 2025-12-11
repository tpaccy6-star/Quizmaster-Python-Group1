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

    # Time Settings
    allow_late_submissions = db.Column(db.Boolean, default=False)

    # Attempt Settings
    # highest, latest, average
    retake_policy = db.Column(db.String(20), default='highest')
    show_correct_answers = db.Column(db.Boolean, default=False)

    # Security Settings
    prevent_tab_switching = db.Column(db.Boolean, default=False)
    require_fullscreen = db.Column(db.Boolean, default=False)
    enable_camera_monitoring = db.Column(db.Boolean, default=False)

    # Display Settings
    show_questions_one_at_a_time = db.Column(db.Boolean, default=False)
    show_progress_bar = db.Column(db.Boolean, default=True)

    # Grading Settings
    enable_auto_grading = db.Column(db.Boolean, default=True)
    allow_partial_credit = db.Column(db.Boolean, default=True)

    # Access Settings
    password_protection = db.Column(db.Boolean, default=False)
    quiz_password = db.Column(db.String(255))
    allowed_ip_addresses = db.Column(db.Text)  # JSON array of IPs
    require_access_code = db.Column(db.Boolean, default=True)

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

            # Basic Settings
            'passing_percentage': self.passing_percentage,
            'max_attempts': self.max_attempts,
            'show_answers_after_submission': self.show_answers_after_submission,
            'randomize_questions': self.randomize_questions,
            'randomize_options': self.randomize_options,
            'allow_review': self.allow_review,

            # Time Settings
            'allow_late_submissions': self.allow_late_submissions,

            # Attempt Settings
            'retake_policy': self.retake_policy,
            'show_correct_answers': self.show_correct_answers,

            # Security Settings
            'prevent_tab_switching': self.prevent_tab_switching,
            'require_fullscreen': self.require_fullscreen,
            'enable_camera_monitoring': self.enable_camera_monitoring,

            # Display Settings
            'show_questions_one_at_a_time': self.show_questions_one_at_a_time,
            'show_progress_bar': self.show_progress_bar,

            # Grading Settings
            'enable_auto_grading': self.enable_auto_grading,
            'allow_partial_credit': self.allow_partial_credit,

            # Access Settings
            'password_protection': self.password_protection,
            'quiz_password': self.quiz_password,
            'allowed_ip_addresses': self.allowed_ip_addresses,
            'require_access_code': self.require_access_code
        }

        questions = list(self.questions or [])
        data['total_questions'] = len(questions)

        total_marks = 0
        for qq in questions:
            marks = None
            if getattr(qq, 'marks_override', None) is not None:
                marks = qq.marks_override
            elif getattr(qq, 'question', None) is not None:
                marks = getattr(qq.question, 'marks', None)
            total_marks += marks or 0

        data['total_marks'] = total_marks

        if include_questions:
            data['questions'] = [qq.question.to_dict()
                                 for qq in questions if getattr(qq, 'question', None)]
        if include_classes:
            data['classes'] = [c.to_dict() for c in self.classes]
            data['class_ids'] = [c.id for c in self.classes]
        return data

    def __repr__(self):
        return f'<Quiz {self.title}>'
