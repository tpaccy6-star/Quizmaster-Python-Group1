from app import db
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class QuizQuestion(db.Model):
    __tablename__ = 'quiz_questions'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    quiz_id = db.Column(db.String(36), db.ForeignKey(
        'quizzes.id', ondelete='CASCADE'), nullable=False)
    question_id = db.Column(db.String(36), db.ForeignKey(
        'questions.id', ondelete='CASCADE'), nullable=False)
    order_index = db.Column(db.Integer, nullable=False)
    # Override question marks for this quiz
    marks_override = db.Column(db.Integer)

    # Relationships
    quiz = db.relationship('Quiz', back_populates='questions')
    question = db.relationship('Question', back_populates='quizzes')

    __table_args__ = (
        db.UniqueConstraint('quiz_id', 'question_id',
                            name='unique_quiz_question'),
        db.UniqueConstraint('quiz_id', 'order_index',
                            name='unique_quiz_order'),
    )

    def to_dict(self):
        question_data = self.question.to_dict()
        question_data['order_index'] = self.order_index
        if self.marks_override:
            question_data['marks'] = self.marks_override
        return question_data

    def __repr__(self):
        return f'<QuizQuestion Quiz:{self.quiz_id} Question:{self.question_id}>'
