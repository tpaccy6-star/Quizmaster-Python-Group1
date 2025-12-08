from datetime import datetime
from app import db
import uuid


def generate_uuid():
    return str(uuid.uuid4())


# Association table for teacher-class many-to-many relationship
teacher_classes = db.Table('teacher_classes',
                           db.Column('id', db.String(36),
                                     primary_key=True, default=generate_uuid),
                           db.Column('teacher_id', db.String(36), db.ForeignKey(
                               'teachers.id', ondelete='CASCADE'), nullable=False),
                           db.Column('class_id', db.String(36), db.ForeignKey(
                               'classes.id', ondelete='CASCADE'), nullable=False),
                           db.Column('assigned_at', db.DateTime,
                                     default=datetime.utcnow)
                           )


class Class(db.Model):
    __tablename__ = 'classes'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    name = db.Column(db.String(100), nullable=False, index=True)
    section = db.Column(db.String(50))
    academic_year = db.Column(db.String(20))
    created_by = db.Column(db.String(36), db.ForeignKey(
        'users.id', ondelete='SET NULL'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = db.relationship('User', foreign_keys=[created_by])
    students = db.relationship(
        'Student', back_populates='class_', foreign_keys='Student.class_id')
    teachers = db.relationship(
        'Teacher', secondary=teacher_classes, back_populates='classes')
    quizzes = db.relationship(
        'Quiz', secondary='quiz_classes', back_populates='classes')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'section': self.section,
            'academic_year': self.academic_year,
            'student_count': len(self.students),
            'teacher_count': len(self.teachers),
            'teachers': [teacher.to_dict() for teacher in self.teachers],
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<Class {self.name}>'
