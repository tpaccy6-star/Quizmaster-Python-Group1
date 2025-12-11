# Quiz Service
# Module Owner: Student 5 - Question Bank Specialist

# Handles all quiz and question-related business logic

import uuid
from datetime import datetime
from app import db
from app.models.quiz import Quiz, QuizStatus
from app.models.question import Question, QuestionType, Difficulty
from app.models.quiz_question import QuizQuestion
from app.models.class_model import Class
from app.services.notification_service import NotificationService


class QuizService:

    @staticmethod
    def create_quiz(teacher_id, quiz_data, class_ids):
        """Create a new quiz"""
        # Generate unique access code
        access_code = ''.join([str(uuid.uuid4().int)[:6].upper()])

        quiz = Quiz(
            title=quiz_data['title'],
            subject=quiz_data['subject'],
            description=quiz_data.get('description'),
            access_code=access_code,
            time_limit_minutes=quiz_data['time_limit_minutes'],
            created_by=teacher_id,
            passing_percentage=quiz_data.get('passing_percentage', 40),
            max_attempts=quiz_data.get('max_attempts', 1),
            show_answers_after_submission=quiz_data.get(
                'show_answers_after_submission', False),
            randomize_questions=quiz_data.get('randomize_questions', False),
            randomize_options=quiz_data.get('randomize_options', False),
            allow_review=quiz_data.get('allow_review', True)
        )

        db.session.add(quiz)
        db.session.flush()  # Get the quiz ID

        # Assign to classes
        classes = Class.query.filter(Class.id.in_(class_ids)).all()
        quiz.classes = classes

        db.session.commit()

        return quiz

    @staticmethod
    def update_quiz(quiz_id, teacher_id, quiz_data):
        """Update an existing quiz"""
        quiz = Quiz.query.get(quiz_id)

        if not quiz:
            raise ValueError('Quiz not found')

        if quiz.created_by != teacher_id:
            raise ValueError('Unauthorized to update this quiz')

        # Update fields
        updatable_fields = ['title', 'subject', 'description', 'time_limit_minutes', 'start_date', 'end_date', 'status',
                            'passing_percentage', 'max_attempts', 'show_answers_after_submission',
                            'randomize_questions', 'randomize_options', 'allow_review']

        for field in updatable_fields:
            if field in quiz_data:
                setattr(quiz, field, quiz_data[field])

        # Update class assignments if provided
        if 'class_ids' in quiz_data:
            classes = Class.query.filter(
                Class.id.in_(quiz_data['class_ids'])).all()
            quiz.classes = classes

        # Update questions if provided
        if 'questions' in quiz_data:
            # Clear existing questions
            QuizQuestion.query.filter_by(quiz_id=quiz_id).delete()

            # Add new questions
            for order_index, question_data in enumerate(quiz_data['questions'], 1):
                if 'id' in question_data:
                    # Use existing question
                    question = Question.query.get(question_data['id'])
                    if not question:
                        continue  # Skip if question not found
                else:
                    # Create new question
                    question = Question(
                        text=question_data['text'],
                        type=QuestionType(question_data['type']),
                        topic=question_data.get('topic'),
                        difficulty=Difficulty(question_data.get(
                            'difficulty', 'medium')) if question_data.get('difficulty') else None,
                        marks=question_data['marks'],
                        created_by=teacher_id,
                        options=question_data.get('options'),
                        correct_answer=question_data.get('correct_answer'),
                        sample_answer=question_data.get('sample_answer'),
                        marking_rubric=question_data.get('marking_rubric')
                    )
                    db.session.add(question)
                    db.session.flush()  # Get the question ID

                # Link question to quiz
                quiz_question = QuizQuestion(
                    quiz_id=quiz_id,
                    question_id=question.id,
                    order_index=order_index
                )
                db.session.add(quiz_question)

        db.session.commit()

        return quiz

    @staticmethod
    def publish_quiz(quiz_id, teacher_id):
        """Publish a quiz"""
        quiz = Quiz.query.get(quiz_id)

        if not quiz:
            raise ValueError('Quiz not found')

        if quiz.created_by != teacher_id:
            raise ValueError('Unauthorized to publish this quiz')

        if quiz.status == QuizStatus.PUBLISHED:
            raise ValueError('Quiz is already published')

        # Check if quiz has questions
        if len(quiz.questions) == 0:
            raise ValueError('Quiz must have questions before publishing')

        quiz.status = QuizStatus.PUBLISHED
        db.session.commit()

        # Notify students in assigned classes
        class_ids = [c.id for c in quiz.classes]
        NotificationService.notify_quiz_published(
            quiz_id=quiz.id,
            quiz_title=quiz.title,
            subject=quiz.subject,
            class_ids=class_ids
        )

        return quiz

    @staticmethod
    def add_question_to_quiz(quiz_id, teacher_id, question_data):
        """Add a question to a quiz"""
        quiz = Quiz.query.get(quiz_id)

        if not quiz:
            raise ValueError('Quiz not found')

        if quiz.created_by != teacher_id:
            raise ValueError('Unauthorized to modify this quiz')

        # Check if it's an existing question or new question
        if 'question_id' in question_data:
            # Add existing question
            question = Question.query.get(question_data['question_id'])
            if not question:
                raise ValueError('Question not found')

            if question.created_by != teacher_id:
                raise ValueError('Cannot add question you don\'t own')
        else:
            # Create new question
            required_fields = ['text', 'type', 'marks']
            for field in required_fields:
                if field not in question_data:
                    raise ValueError(f'{field} is required')

            try:
                question = Question(
                    text=question_data['text'],
                    type=QuestionType(question_data['type']),
                    topic=question_data.get('topic'),
                    difficulty=Difficulty(question_data.get(
                        'difficulty', 'medium')) if question_data.get('difficulty') else None,
                    marks=question_data['marks'],
                    created_by=teacher_id,
                    options=question_data.get('options'),
                    correct_answer=question_data.get('correct_answer'),
                    sample_answer=question_data.get('sample_answer'),
                    marking_rubric=question_data.get('marking_rubric')
                )

                db.session.add(question)
                db.session.flush()
            except ValueError as e:
                raise ValueError(f'Invalid question data: {str(e)}')

        # Add to quiz
        # Get next order index
        last_question = QuizQuestion.query.filter_by(
            quiz_id=quiz_id).order_by(QuizQuestion.order_index.desc()).first()
        order_index = (last_question.order_index + 1) if last_question else 1

        quiz_question = QuizQuestion(
            quiz_id=quiz_id,
            question_id=question.id,
            order_index=order_index,
            marks_override=question_data.get('marks_override')
        )

        db.session.add(quiz_question)
        db.session.commit()

        return question

    @staticmethod
    def remove_question_from_quiz(quiz_id, teacher_id, question_id):
        """Remove a question from a quiz"""
        quiz = Quiz.query.get(quiz_id)

        if not quiz:
            raise ValueError('Quiz not found')

        if quiz.created_by != teacher_id:
            raise ValueError('Unauthorized to modify this quiz')

        quiz_question = QuizQuestion.query.filter_by(
            quiz_id=quiz_id,
            question_id=question_id
        ).first()

        if not quiz_question:
            raise ValueError('Question not found in quiz')

        db.session.delete(quiz_question)

        # Reorder remaining questions
        remaining_questions = QuizQuestion.query.filter_by(
            quiz_id=quiz_id).order_by(QuizQuestion.order_index).all()
        for idx, qq in enumerate(remaining_questions, 1):
            qq.order_index = idx

        db.session.commit()

        return True

    @staticmethod
    def create_question(teacher_id, question_data):
        """Create a new question in the question bank"""
        required_fields = ['text', 'type', 'marks']
        for field in required_fields:
            if field not in question_data:
                raise ValueError(f'{field} is required')

        try:
            question = Question(
                text=question_data['text'],
                type=QuestionType(question_data['type']),
                topic=question_data.get('topic'),
                difficulty=Difficulty(question_data.get(
                    'difficulty', 'medium')) if question_data.get('difficulty') else None,
                marks=question_data['marks'],
                created_by=teacher_id,
                options=question_data.get('options'),
                correct_answer=question_data.get('correct_answer'),
                sample_answer=question_data.get('sample_answer'),
                marking_rubric=question_data.get('marking_rubric')
            )

            db.session.add(question)
            db.session.commit()

            return question
        except ValueError as e:
            raise ValueError(f'Invalid question data: {str(e)}')

    @staticmethod
    def get_question_bank(teacher_id, page=1, per_page=20, question_type=None, topic=None, difficulty=None):
        """Get teacher's question bank with filtering"""
        query = Question.query.filter_by(created_by=teacher_id)

        if question_type:
            try:
                q_type = QuestionType(question_type)
                query = query.filter_by(type=q_type)
            except ValueError:
                raise ValueError('Invalid question type')

        if topic:
            query = query.filter(Question.topic.ilike(f'%{topic}%'))

        if difficulty:
            try:
                diff = Difficulty(difficulty)
                query = query.filter_by(difficulty=diff)
            except ValueError:
                raise ValueError('Invalid difficulty')

        questions = query.order_by(Question.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return {
            'questions': [q.to_dict() for q in questions.items],
            'total': questions.total,
            'pages': questions.pages,
            'current_page': page
        }

    @staticmethod
    def get_quiz_by_access_code(access_code):
        """Get quiz by access code"""
        quiz = Quiz.query.filter_by(access_code=access_code).first()

        if not quiz:
            raise ValueError('Invalid access code')

        if quiz.status != QuizStatus.PUBLISHED:
            raise ValueError('Quiz is not available')

        return quiz
