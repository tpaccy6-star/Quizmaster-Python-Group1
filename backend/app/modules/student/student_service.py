# Student Service
# Module Owner: Student 4 - Student Experience Specialist

# Handles all student-related business logic

from datetime import datetime
from app import db
from app.models.student import Student
from app.models.class_model import Class
from app.models.quiz import Quiz, QuizStatus
from app.models.quiz_attempt import QuizAttempt, AttemptStatus
from app.services.attempt_reset_service import AttemptResetService


class StudentService:

    @staticmethod
    def get_student_dashboard(student_id):
        """Get student dashboard data"""
        student = Student.query.get(student_id)

        if not student:
            raise ValueError('Student not found')

        # Get available quizzes
        available_quizzes = []
        if student.class_:
            for class_obj in student.class_:
                for quiz in class_obj.quizzes:
                    if quiz.status == QuizStatus.PUBLISHED:
                        # Check if student has attempts left
                        remaining = AttemptResetService.get_student_available_attempts(
                            student_id, quiz.id
                        )
                        if remaining > 0:
                            quiz_data = quiz.to_dict()
                            quiz_data['remaining_attempts'] = remaining
                            available_quizzes.append(quiz_data)

        # Get recent attempts
        recent_attempts = QuizAttempt.query.filter_by(
            student_id=student_id
        ).order_by(QuizAttempt.started_at.desc()).limit(10).all()

        return {
            'student': student.to_dict(include_user=False),
            'class': student.class_.to_dict() if student.class_ else None,
            'available_quizzes': available_quizzes,
            'recent_attempts': [a.to_dict() for a in recent_attempts],
            'stats': {
                'total_attempts': QuizAttempt.query.filter_by(student_id=student_id).count(),
                'completed_attempts': QuizAttempt.query.filter_by(
                    student_id=student_id,
                    status=AttemptStatus.SUBMITTED
                ).count(),
                'available_quizzes': len(available_quizzes)
            }
        }

    @staticmethod
    def get_available_quizzes(student_id):
        """Get quizzes available to the student"""
        student = Student.query.get(student_id)

        if not student or not student.class_:
            return {'quizzes': []}

        # Get published quizzes assigned to student's class
        quizzes = Quiz.query.filter_by(status=QuizStatus.PUBLISHED).filter(
            Quiz.classes.any(id=student.class_id)
        ).all()

        quiz_data = []
        for quiz in quizzes:
            remaining = AttemptResetService.get_student_available_attempts(
                student_id, quiz.id
            )

            quiz_info = quiz.to_dict()
            quiz_info['remaining_attempts'] = remaining
            quiz_info['can_attempt'] = remaining > 0

            # Get latest attempt info
            latest_attempt = QuizAttempt.query.filter_by(
                student_id=student_id,
                quiz_id=quiz.id
            ).order_by(QuizAttempt.started_at.desc()).first()

            if latest_attempt:
                quiz_info['latest_attempt'] = latest_attempt.to_dict()

            quiz_data.append(quiz_info)

        return {'quizzes': quiz_data}

    @staticmethod
    def get_student_results(student_id, page=1, per_page=10):
        """Get student's quiz results"""
        attempts = QuizAttempt.query.filter_by(
            student_id=student_id
        ).filter(
            QuizAttempt.status.in_(
                [AttemptStatus.SUBMITTED, AttemptStatus.GRADED])
        ).order_by(QuizAttempt.submitted_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        results = []
        for attempt in attempts.items:
            data = attempt.to_dict(include_answers=True)
            data['quiz'] = attempt.quiz.to_dict()
            results.append(data)

        return {
            'results': results,
            'total': attempts.total,
            'pages': attempts.pages,
            'current_page': page
        }

    @staticmethod
    def start_quiz_attempt(student_id, quiz_id):
        """Start a new quiz attempt"""
        student = Student.query.get(student_id)
        quiz = Quiz.query.get(quiz_id)

        if not student or not quiz:
            raise ValueError('Student or quiz not found')

        # Check if quiz is published
        if quiz.status != QuizStatus.PUBLISHED:
            raise ValueError('Quiz is not available')

        # Check if student is enrolled
        if not student.class_ or quiz not in student.class_.quizzes:
            raise ValueError('Student not enrolled in this quiz')

        # Check attempts remaining
        remaining = AttemptResetService.get_student_available_attempts(
            student_id, quiz_id)
        if remaining <= 0:
            raise ValueError('No attempts remaining')

        # Get next attempt number
        last_attempt = QuizAttempt.query.filter_by(
            student_id=student_id,
            quiz_id=quiz_id
        ).order_by(QuizAttempt.attempt_number.desc()).first()

        attempt_number = (last_attempt.attempt_number +
                          1) if last_attempt else 1

        # Create attempt
        attempt = QuizAttempt(
            quiz_id=quiz_id,
            student_id=student_id,
            attempt_number=attempt_number,
            status=AttemptStatus.IN_PROGRESS,
            total_marks=sum(
                qq.marks_override or qq.question.marks for qq in quiz.questions)
        )

        db.session.add(attempt)
        db.session.commit()

        return attempt.to_dict(include_questions=True)

    @staticmethod
    def submit_answer(student_id, attempt_id, question_id, answer_data):
        """Submit or update an answer in a quiz attempt"""
        attempt = QuizAttempt.query.filter_by(
            id=attempt_id,
            student_id=student_id
        ).first()

        if not attempt:
            raise ValueError('Attempt not found')

        if attempt.status != AttemptStatus.IN_PROGRESS:
            raise ValueError('Attempt is not active')

        # Check time limit
        if attempt.is_time_expired():
            attempt.status = AttemptStatus.AUTO_SUBMITTED
            db.session.commit()
            raise ValueError('Time limit exceeded')

        from app.models.student_answer import StudentAnswer

        # Find existing answer or create new
        answer = StudentAnswer.query.filter_by(
            attempt_id=attempt_id,
            question_id=question_id
        ).first()

        if not answer:
            answer = StudentAnswer(
                attempt_id=attempt_id,
                question_id=question_id
            )
            db.session.add(answer)

        # Update answer based on question type
        if isinstance(answer_data, str):
            answer.answer_text = answer_data
        elif isinstance(answer_data, int):
            answer.answer_option = answer_data

        answer.updated_at = datetime.utcnow()
        db.session.commit()

        return answer.to_dict()

    @staticmethod
    def submit_quiz_attempt(student_id, attempt_id):
        """Submit a completed quiz attempt"""
        attempt = QuizAttempt.query.filter_by(
            id=attempt_id,
            student_id=student_id
        ).first()

        if not attempt:
            raise ValueError('Attempt not found')

        if attempt.status != AttemptStatus.IN_PROGRESS:
            raise ValueError('Attempt already submitted')

        # Calculate score for MCQ questions
        total_score = 0
        for answer in attempt.answers:
            if answer.question.type == 'mcq' and answer.answer_option is not None:
                if answer.answer_option == answer.question.correct_answer:
                    marks = answer.quiz_question.marks_override or answer.question.marks
                    answer.marks_awarded = marks
                    total_score += marks

        attempt.score = total_score
        attempt.percentage = (
            total_score / attempt.total_marks * 100) if attempt.total_marks > 0 else 0
        attempt.passed = attempt.percentage >= attempt.quiz.passing_percentage
        attempt.status = AttemptStatus.SUBMITTED
        attempt.submitted_at = datetime.utcnow()

        # Check if all questions are MCQ (auto-grade)
        has_descriptive = any(
            ans.question.type in ['descriptive', 'short_answer']
            for ans in attempt.answers
        )

        if not has_descriptive:
            attempt.status = AttemptStatus.GRADED

        db.session.commit()

        return attempt.to_dict(include_answers=True)

    @staticmethod
    def update_student_profile(student_id, profile_data):
        """Update student profile"""
        student = Student.query.get(student_id)

        if not student:
            raise ValueError('Student not found')

        # Update student-specific fields
        updatable_fields = ['parent_email', 'parent_phone']
        for field in updatable_fields:
            if field in profile_data:
                setattr(student, field, profile_data[field])

        # Update user fields
        from app.models.user import User
        user = User.query.get(student_id)
        if user:
            user_fields = ['name']
            for field in user_fields:
                if field in profile_data:
                    setattr(user, field, profile_data[field])

        db.session.commit()

        return student.to_dict()
