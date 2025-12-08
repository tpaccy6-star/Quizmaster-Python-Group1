from datetime import datetime
from app import db


class Teacher(db.Model):
    __tablename__ = 'teachers'

    id = db.Column(db.String(36), db.ForeignKey(
        'users.id', ondelete='CASCADE'), primary_key=True)
    subject = db.Column(db.String(100))
    phone = db.Column(db.String(20))
    department = db.Column(db.String(100))
    bio = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship('User', back_populates='teacher')
    classes = db.relationship(
        'Class', secondary='teacher_classes', back_populates='teachers')
    quizzes = db.relationship(
        'Quiz', back_populates='creator', foreign_keys='Quiz.created_by')
    questions = db.relationship('Question', back_populates='creator')
    graded_answers = db.relationship(
        'StudentAnswer', back_populates='graded_by_teacher')

    def to_dict(self, include_user=True):
        data = {
            'id': self.id,
            'subject': self.subject,
            'phone': self.phone,
            'department': self.department,
            'bio': self.bio,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_user and self.user:
            data.update(self.user.to_dict())
        return data

    def __repr__(self):
        return f'<Teacher {self.user.name if self.user else self.id}>'
