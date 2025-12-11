# Student Service
# Module Owner: Student 4 - Student Experience Specialist

# Handles all student-related business logic

from datetime import datetime
from app import db
from app.models.student import Student
from app.models.class_model import Class
from app.models.quiz import Quiz, QuizStatus
from app.models.quiz_attempt import QuizAttempt, AttemptStatus
from app.models.quiz_question import QuizQuestion
from app.services.attempt_reset_service import AttemptResetService
from sqlalchemy import cast, String


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
            for quiz in student.class_.quizzes:
                if StudentService._is_published(quiz.status):
                    # Check if student has attempts left
                    remaining = AttemptResetService.get_student_available_attempts(
                        student_id, quiz.id
                    )
                    if remaining > 0:
                        availability_status = StudentService._quiz_availability_status(
                            quiz)
                        quiz_data = quiz.to_dict()
                        quiz_data['remaining_attempts'] = remaining
                        quiz_data['is_available_now'] = availability_status == 'open'
                        quiz_data['availability_status'] = availability_status
                        quiz_data['available_from'] = quiz.start_date.isoformat(
                        ) if quiz.start_date else None
                        quiz_data['available_until'] = quiz.end_date.isoformat(
                        ) if quiz.end_date else None
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
        quizzes = Quiz.query.filter(
            cast(Quiz.status, String).ilike('published'),
            Quiz.classes.any(id=student.class_id)
        ).all()

        quiz_data = []
        for quiz in quizzes:
            remaining = AttemptResetService.get_student_available_attempts(
                student_id, quiz.id
            )

            availability_status = StudentService._quiz_availability_status(
                quiz)

            quiz_info = quiz.to_dict()
            quiz_info['remaining_attempts'] = remaining
            quiz_info['can_attempt'] = remaining > 0
            quiz_info['is_available_now'] = availability_status == 'open'
            quiz_info['availability_status'] = availability_status
            quiz_info['available_from'] = quiz.start_date.isoformat(
            ) if quiz.start_date else None
            quiz_info['available_until'] = quiz.end_date.isoformat(
            ) if quiz.end_date else None

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
        if not StudentService._is_published(quiz.status):
            raise ValueError('Quiz is not available')

        # Check if student is enrolled
        if not student.class_ or quiz not in student.class_.quizzes:
            raise ValueError('Student not enrolled in this quiz')

        availability_status = StudentService._quiz_availability_status(quiz)
        if availability_status == 'upcoming':
            raise ValueError('Quiz is not yet available')
        if availability_status == 'closed':
            raise ValueError('Quiz availability has ended')

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

        # Compute total marks even if some question relationships are missing
        total_marks = 0
        for qq in quiz.questions:
            marks = None
            if hasattr(qq, 'marks_override') and qq.marks_override is not None:
                marks = qq.marks_override
            elif hasattr(qq, 'question') and qq.question is not None:
                marks = getattr(qq.question, 'marks', None)

            total_marks += marks or 0

        attempt = QuizAttempt(
            quiz_id=quiz_id,
            student_id=student_id,
            attempt_number=attempt_number,
            status=AttemptStatus.IN_PROGRESS,
            total_marks=total_marks,
            progress=0,
            current_question_index=0,
            last_activity_at=datetime.utcnow()
        )

        db.session.add(attempt)
        db.session.commit()

        attempt_data = attempt.to_dict()
        attempt_data['quiz'] = quiz.to_dict(include_questions=True)

        return attempt_data

    @staticmethod
    def _is_published(status) -> bool:
        """Helper to determine if a quiz status represents published."""
        if isinstance(status, QuizStatus):
            return status == QuizStatus.PUBLISHED
        if hasattr(status, 'value'):
            return str(status.value).lower() == 'published'
        return str(status).lower() == 'published'

    @staticmethod
    def _quiz_availability_status(quiz) -> str:
        """Return availability status for a quiz: 'open', 'upcoming', or 'closed'."""
        now = StudentService._current_time_for_quiz(quiz)

        start_date = quiz.start_date
        end_date = quiz.end_date

        if start_date and StudentService._compare_datetime(now, start_date) < 0:
            return 'upcoming'
        if end_date and StudentService._compare_datetime(now, end_date) > 0:
            return 'closed'
        return 'open'

    @staticmethod
    def _quiz_available_now(quiz) -> bool:
        return StudentService._quiz_availability_status(quiz) == 'open'

    @staticmethod
    def _current_time_for_quiz(quiz) -> datetime:
        """Return current time aligned with quiz datetime timezone (if provided)."""
        references = [dt for dt in [
            quiz.start_date, quiz.end_date] if dt is not None]
        for ref in references:
            if ref.tzinfo is not None and ref.tzinfo.utcoffset(ref) is not None:
                return datetime.now(ref.tzinfo)
        # Fallback: assume naive datetimes are stored in local server time
        return datetime.now()

    @staticmethod
    def _compare_datetime(left: datetime, right: datetime) -> int:
        """Compare datetimes handling naive vs aware values safely."""
        left_cmp = left
        right_cmp = right

        if right_cmp.tzinfo is not None and right_cmp.tzinfo.utcoffset(right_cmp) is not None:
            if left_cmp.tzinfo is None or left_cmp.tzinfo.utcoffset(left_cmp) is None:
                left_cmp = left_cmp.replace(tzinfo=right_cmp.tzinfo)
        elif left_cmp.tzinfo is not None and left_cmp.tzinfo.utcoffset(left_cmp) is not None:
            right_cmp = right_cmp.replace(tzinfo=left_cmp.tzinfo)

        if left_cmp < right_cmp:
            return -1
        if left_cmp > right_cmp:
            return 1
        return 0

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

        # Update attempt progress metadata
        total_questions = len(
            attempt.quiz.questions) if attempt.quiz and attempt.quiz.questions else 0
        answered_count = 0
        for ans in attempt.answers:
            if ans.answer_text not in (None, '') or ans.answer_option is not None:
                answered_count += 1

        if total_questions > 0:
            attempt.progress = min(
                100, int((answered_count / total_questions) * 100))

        quiz_question = QuizQuestion.query.filter_by(
            quiz_id=attempt.quiz_id,
            question_id=question_id
        ).first()

        if quiz_question and quiz_question.order_index is not None:
            attempt.current_question_index = quiz_question.order_index

        attempt.last_activity_at = datetime.utcnow()

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
            return attempt.to_dict(include_answers=True)

        # Calculate score for MCQ questions
        total_score = 0
        for answer in attempt.answers:
            if answer.question.type == 'mcq' and answer.answer_option is not None:
                if answer.answer_option == answer.question.correct_answer:
                    marks = answer.question.marks
                    answer.marks_awarded = marks
                    total_score += marks

        attempt.score = total_score
        attempt.percentage = (
            total_score / attempt.total_marks * 100) if attempt.total_marks > 0 else 0
        attempt.passed = attempt.percentage >= attempt.quiz.passing_percentage
        attempt.status = AttemptStatus.SUBMITTED
        attempt.submitted_at = datetime.utcnow()
        attempt.progress = 100
        attempt.last_activity_at = datetime.utcnow()

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
