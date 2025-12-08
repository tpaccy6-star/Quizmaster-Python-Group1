from datetime import datetime
from app import db


class Student(db.Model):
    __tablename__ = 'students'

    id = db.Column(db.String(36), db.ForeignKey(
        'users.id', ondelete='CASCADE'), primary_key=True)
    registration_number = db.Column(
        db.String(50), unique=True, nullable=False, index=True)
    class_id = db.Column(db.String(36), db.ForeignKey(
        'classes.id', ondelete='SET NULL'))
    date_of_birth = db.Column(db.Date)
    parent_email = db.Column(db.String(255))
    parent_phone = db.Column(db.String(20))
    is_account_claimed = db.Column(db.Boolean, default=False)
    claimed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship('User', back_populates='student')
    class_ = db.relationship(
        'Class', back_populates='students', foreign_keys=[class_id])
    attempts = db.relationship(
        'QuizAttempt', back_populates='student', cascade='all, delete-orphan')

    def to_dict(self, include_user=True):
        data = {
            'id': self.id,
            'registration_number': self.registration_number,
            'class_id': self.class_id,
            'class_name': self.class_.name if self.class_ else None,
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'parent_email': self.parent_email,
            'parent_phone': self.parent_phone,
            'is_account_claimed': self.is_account_claimed,
            'claimed_at': self.claimed_at.isoformat() if self.claimed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_user and self.user:
            data.update(self.user.to_dict())
        return data

    def __repr__(self):
        return f'<Student {self.registration_number}>'
