# Grading Service
# Module Owner: Teacher Grading Specialist

# Handles all grading-related business logic

from datetime import datetime
from app import db
from app.models.quiz_attempt import QuizAttempt, AttemptStatus
from app.models.student_answer import StudentAnswer
from app.models.question import Question, QuestionType
from app.services.notification_service import NotificationService


class GradingService:

    @staticmethod
    def get_pending_attempts(teacher_id, page=1, per_page=20):
        """Get pending attempts that need grading (only those with descriptive questions)"""
        # Get all quizzes created by this teacher
        from app.models.quiz import Quiz
        from app.models.question import Question, QuestionType

        teacher_quizzes = Quiz.query.filter_by(created_by=teacher_id).all()
        quiz_ids = [q.id for q in teacher_quizzes]

        # Get attempts for these quizzes that have descriptive questions and are submitted
        attempts = QuizAttempt.query.options(
            db.joinedload(QuizAttempt.quiz),
            db.joinedload(QuizAttempt.student),
            db.joinedload(QuizAttempt.answers)
        ).filter(
            QuizAttempt.quiz_id.in_(quiz_ids),
            QuizAttempt.status == AttemptStatus.SUBMITTED
        ).join(Quiz).filter(
            Quiz.questions.any(Question.type == QuestionType.DESCRIPTIVE)
        ).order_by(QuizAttempt.submitted_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        attempts_data = []
        for attempt in attempts.items:
            attempt_dict = attempt.to_dict(include_answers=True)
            if attempt.quiz:
                attempt_dict['quiz'] = attempt.quiz.to_dict()
            if attempt.student:
                attempt_dict['student'] = attempt.student.to_dict()
            attempts_data.append(attempt_dict)

        return {
            'attempts': attempts_data,
            'total': attempts.total,
            'pages': attempts.pages,
            'current_page': page,
            'quizzes': [quiz.to_dict() for quiz in teacher_quizzes]
        }

    @staticmethod
    def get_graded_attempts(teacher_id, page=1, per_page=20):
        """Get already graded attempts"""
        from app.models.quiz import Quiz

        teacher_quizzes = Quiz.query.filter_by(created_by=teacher_id).all()
        quiz_ids = [q.id for q in teacher_quizzes]

        attempts = QuizAttempt.query.options(
            db.joinedload(QuizAttempt.quiz),
            db.joinedload(QuizAttempt.student),
            db.joinedload(QuizAttempt.answers)
        ).filter(
            QuizAttempt.quiz_id.in_(quiz_ids),
            QuizAttempt.status == AttemptStatus.GRADED
        ).order_by(QuizAttempt.submitted_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        attempts_data = []
        for attempt in attempts.items:
            attempt_dict = attempt.to_dict(include_answers=True)
            if attempt.quiz:
                attempt_dict['quiz'] = attempt.quiz.to_dict()
            if attempt.student:
                attempt_dict['student'] = attempt.student.to_dict()
            attempts_data.append(attempt_dict)

        return {
            'attempts': attempts_data,
            'total': attempts.total,
            'pages': attempts.pages,
            'current_page': page,
            'quizzes': [quiz.to_dict() for quiz in teacher_quizzes]
        }

    @staticmethod
    def grade_attempt(attempt_id, teacher_id, grades_data):
        """Grade an attempt with provided grades for descriptive questions"""
        attempt = QuizAttempt.query.get(attempt_id)

        if not attempt:
            raise ValueError('Attempt not found')

        # Verify teacher owns this quiz
        if attempt.quiz.created_by != teacher_id:
            raise ValueError('Unauthorized to grade this attempt')

        if attempt.status != AttemptStatus.SUBMITTED:
            raise ValueError('Attempt cannot be graded')

        # Update grades for descriptive questions
        total_score = 0
        total_possible = 0

        for grade_item in grades_data:
            question_id = grade_item.get('question_id')
            marks_awarded = grade_item.get('marks_awarded', 0)
            feedback = grade_item.get('feedback', '')

            # Find the student's answer for this question
            answer = StudentAnswer.query.filter_by(
                attempt_id=attempt_id,
                question_id=question_id
            ).first()

            if answer:
                # Get the question to check max marks
                question = Question.query.get(question_id)
                if question:
                    total_possible += question.marks

                    # Only add to score if it's a descriptive question
                    if question.type == QuestionType.DESCRIPTIVE:
                        total_score += marks_awarded

                    # Update the answer with grades
                    answer.marks_awarded = marks_awarded
                    answer.feedback = feedback
                    answer.graded_at = datetime.utcnow()

        # Calculate MCQ scores (auto-graded)
        mcq_answers = StudentAnswer.query.join(Question).filter(
            StudentAnswer.attempt_id == attempt_id,
            Question.type == QuestionType.MCQ
        ).all()

        for answer in mcq_answers:
            question = answer.question
            total_possible += question.marks

            # Auto-grade MCQ if not already graded
            if answer.marks_awarded is None:
                if answer.answer_option == question.correct_answer:
                    answer.marks_awarded = question.marks
                    total_score += question.marks
            else:
                total_score += answer.marks_awarded

        # Update attempt status and score
        attempt.score = total_score
        attempt.total_marks = total_possible
        attempt.status = AttemptStatus.GRADED
        # Note: graded_at and graded_by fields don't exist in the model
        # We'll use submitted_at as the grading timestamp

        db.session.commit()

        # Send notification to student
        NotificationService.notify_attempt_graded(
            student_id=attempt.student_id,
            quiz_title=attempt.quiz.title,
            score=float(total_score),
            total_marks=total_possible,
            percentage=(total_score / total_possible *
                        100) if total_possible > 0 else 0
        )

        return attempt.to_dict(include_answers=True)

    @staticmethod
    def get_grading_statistics(teacher_id):
        """Get grading statistics for teacher"""
        from app.models.quiz import Quiz
        teacher_quizzes = Quiz.query.filter_by(created_by=teacher_id).all()
        quiz_ids = [q.id for q in teacher_quizzes]

        # Total attempts
        total_attempts = QuizAttempt.query.filter(
            QuizAttempt.quiz_id.in_(quiz_ids)
        ).count()

        # Pending attempts
        pending_attempts = QuizAttempt.query.filter(
            QuizAttempt.quiz_id.in_(quiz_ids),
            QuizAttempt.status == AttemptStatus.SUBMITTED
        ).join(Quiz).filter(
            Quiz.questions.any(Question.type == QuestionType.DESCRIPTIVE)
        ).count()

        # Graded attempts
        graded_attempts = QuizAttempt.query.filter(
            QuizAttempt.quiz_id.in_(quiz_ids),
            QuizAttempt.status == AttemptStatus.GRADED
        ).count()

        return {
            'total_attempts': total_attempts,
            'pending_attempts': pending_attempts,
            'graded_attempts': graded_attempts,
            'grading_progress': graded_attempts / max(total_attempts, 1) * 100
        }
