# Attempt Service
# Module Owner: Student 7 - Attempt Management Specialist

# Handles all attempt-related business logic

from datetime import datetime
from app import db
from app.models.quiz_attempt import QuizAttempt, AttemptStatus
from app.models.violation import Violation, ViolationType
from app.models.attempt_history import AttemptHistory
from app.services.attempt_reset_service import AttemptResetService


class AttemptService:

    @staticmethod
    def get_attempt_by_id(attempt_id, user_id=None):
        """Get attempt by ID with optional user verification"""
        attempt = QuizAttempt.query.get(attempt_id)

        if not attempt:
            raise ValueError('Attempt not found')

        if user_id and attempt.student_id != user_id:
            raise ValueError('Unauthorized to view this attempt')

        return attempt

    @staticmethod
    def get_student_attempts(student_id, quiz_id=None, page=1, per_page=20):
        """Get student's attempts with optional quiz filter"""
        query = QuizAttempt.query.filter_by(student_id=student_id)

        if quiz_id:
            query = query.filter_by(quiz_id=quiz_id)

        attempts = query.order_by(QuizAttempt.started_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return {
            'attempts': [a.to_dict(include_answers=True) for a in attempts.items],
            'total': attempts.total,
            'pages': attempts.pages,
            'current_page': page
        }

    @staticmethod
    def get_quiz_attempts(quiz_id, teacher_id=None, page=1, per_page=20):
        """Get all attempts for a quiz with optional teacher verification"""
        query = QuizAttempt.query.filter_by(quiz_id=quiz_id)

        attempts = query.order_by(QuizAttempt.started_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        attempts_data = []
        for attempt in attempts.items:
            data = attempt.to_dict(include_answers=True)
            data['student'] = attempt.student.to_dict(
            ) if attempt.student else None
            attempts_data.append(data)

        return {
            'attempts': attempts_data,
            'total': attempts.total,
            'pages': attempts.pages,
            'current_page': page
        }

    @staticmethod
    def record_violation(attempt_id, violation_type, question_index=None, extra_data=None):
        """Record a violation during a quiz attempt"""
        attempt = QuizAttempt.query.get(attempt_id)

        if not attempt:
            raise ValueError('Attempt not found')

        if attempt.status != AttemptStatus.IN_PROGRESS:
            raise ValueError('Cannot record violation for completed attempt')

        # Create violation record
        violation = Violation(
            attempt_id=attempt_id,
            violation_type=ViolationType(violation_type),
            question_index=question_index,
            extra_data=extra_data or {}
        )

        db.session.add(violation)

        # Update attempt violation count
        attempt.total_violations += 1

        # Check if auto-submit should be triggered
        if attempt.total_violations >= 5:  # Threshold for auto-submit
            attempt.status = AttemptStatus.AUTO_SUBMITTED
            attempt.submitted_at = datetime.utcnow()
            attempt.auto_submitted_due_to_violations = True

        db.session.commit()

        return violation

    @staticmethod
    def get_attempt_violations(attempt_id):
        """Get all violations for an attempt"""
        violations = Violation.query.filter_by(attempt_id=attempt_id).order_by(
            Violation.detected_at.asc()
        ).all()

        return [v.to_dict() for v in violations]

    @staticmethod
    def get_attempt_statistics(quiz_id):
        """Get statistics for quiz attempts"""
        attempts = QuizAttempt.query.filter_by(quiz_id=quiz_id).all()

        if not attempts:
            return {
                'total_attempts': 0,
                'completed_attempts': 0,
                'average_score': 0,
                'pass_rate': 0,
                'violation_count': 0
            }

        completed = [a for a in attempts if a.status in [
            AttemptStatus.SUBMITTED, AttemptStatus.GRADED]]

        total_score = sum(a.score or 0 for a in completed)
        passed = sum(1 for a in completed if a.passed)
        total_violations = sum(a.total_violations for a in attempts)

        return {
            'total_attempts': len(attempts),
            'completed_attempts': len(completed),
            'average_score': total_score / len(completed) if completed else 0,
            'pass_rate': (passed / len(completed) * 100) if completed else 0,
            'violation_count': total_violations
        }

    @staticmethod
    def get_student_attempt_summary(student_id, quiz_id):
        """Get comprehensive attempt summary for a student"""
        attempts = QuizAttempt.query.filter_by(
            student_id=student_id,
            quiz_id=quiz_id
        ).order_by(QuizAttempt.attempt_number.desc()).all()

        if not attempts:
            return None

        quiz = attempts[0].quiz

        # Get available attempts
        remaining = AttemptResetService.get_student_available_attempts(
            student_id, quiz_id)

        # Get attempt history
        history = AttemptHistory.query.filter_by(
            student_id=student_id,
            quiz_id=quiz_id
        ).order_by(AttemptHistory.attempt_number.desc()).all()

        # Calculate statistics
        completed_attempts = [a for a in attempts if a.status in [
            AttemptStatus.SUBMITTED, AttemptStatus.GRADED]]
        best_score = max((a.score or 0 for a in completed_attempts), default=0)
        average_score = sum(a.score or 0 for a in completed_attempts) / \
            len(completed_attempts) if completed_attempts else 0

        return {
            'quiz': quiz.to_dict(),
            'attempts': [a.to_dict() for a in attempts],
            'history': [h.to_dict() for h in history],
            'remaining_attempts': remaining,
            'max_attempts': quiz.max_attempts,
            'total_attempts': len(attempts),
            'completed_attempts': len(completed_attempts),
            'best_score': best_score,
            'average_score': average_score,
            'total_violations': sum(a.total_violations for a in attempts)
        }

    @staticmethod
    def auto_submit_expired_attempts():
        """Auto-submit attempts that have exceeded time limit"""
        expired_attempts = QuizAttempt.query.filter(
            QuizAttempt.status == AttemptStatus.IN_PROGRESS,
            QuizAttempt.started_at < db.func.timestampadd(
                'MINUTE',
                -Quiz.time_limit_minutes,
                datetime.utcnow()
            )
        ).join(Quiz).all()

        for attempt in expired_attempts:
            attempt.status = AttemptStatus.AUTO_SUBMITTED
            attempt.submitted_at = datetime.utcnow()
            # Time-based, not violation-based
            attempt.auto_submitted_due_to_violations = False

        db.session.commit()

        return len(expired_attempts)

    @staticmethod
    def get_categorized_attempts(quiz_id, teacher_id):
        """Get attempts categorized by submission type"""
        quiz = Quiz.query.get(quiz_id)

        if not quiz or quiz.created_by != teacher_id:
            raise ValueError('Quiz not found or unauthorized')

        attempts = QuizAttempt.query.filter_by(quiz_id=quiz_id).all()

        categorized = {
            'manual_submissions': [],
            'auto_submissions': [],
            'in_progress': [],
            'not_started': []
        }

        for attempt in attempts:
            data = attempt.to_dict()
            data['student'] = attempt.student.to_dict(
            ) if attempt.student else None

            if attempt.status == AttemptStatus.SUBMITTED or attempt.status == AttemptStatus.GRADED:
                categorized['manual_submissions'].append(data)
            elif attempt.status == AttemptStatus.AUTO_SUBMITTED:
                categorized['auto_submissions'].append(data)
            elif attempt.status == AttemptStatus.IN_PROGRESS:
                categorized['in_progress'].append(data)

        return categorized

    @staticmethod
    def archive_attempt(attempt_id, reason):
        """Archive an attempt to history"""
        attempt = QuizAttempt.query.get(attempt_id)

        if not attempt:
            raise ValueError('Attempt not found')

        # Create history record
        history = AttemptHistory(
            quiz_id=attempt.quiz_id,
            student_id=attempt.student_id,
            attempt_number=attempt.attempt_number,
            status=attempt.status,
            score=attempt.score,
            total_marks=attempt.total_marks,
            percentage=attempt.percentage,
            total_violations=attempt.total_violations,
            auto_submitted_due_to_violations=attempt.auto_submitted_due_to_violations,
            started_at=attempt.started_at,
            submitted_at=attempt.submitted_at,
            is_active=False
        )

        db.session.add(history)
        db.session.commit()

        return history
