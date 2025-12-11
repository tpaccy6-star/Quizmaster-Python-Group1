from datetime import datetime
from typing import Dict, Any
from uuid import uuid4
from app import db
from app.models.quiz_attempt import QuizAttempt
from app.models.quiz import Quiz
from app.models.student import Student
from app.models.user import User
from app.models.attempt_history import AttemptHistory
from app.models.audit_log import AuditLog
from app.services.notification_service import NotificationService


class AttemptResetService:

    @staticmethod
    def reset_student_attempts(
        student_id: str,
        quiz_id: str,
        additional_attempts: int,
        reset_by: str,
        reason: str
    ) -> Dict[str, Any]:
        """
        Reset quiz attempts for a specific student
        - Archives current attempts to history
        - Grants additional attempts
        - Notifies student
        - Logs action
        """

        # Get quiz and student
        quiz = Quiz.query.get(quiz_id)
        student = Student.query.get(student_id)
        user = User.query.get(student_id)

        if not quiz or not student:
            raise ValueError("Quiz or student not found")

        # Get all attempts for this student-quiz combination
        attempts = QuizAttempt.query.filter_by(
            student_id=student_id,
            quiz_id=quiz_id
        ).all()

        # Archive existing attempts to history
        for attempt in attempts:
            history = AttemptHistory(
                id=str(uuid4()),  # Generate new UUID to avoid duplicate key
                quiz_id=attempt.quiz_id,
                student_id=attempt.student_id,
                attempt_number=attempt.attempt_number,
                status=attempt.status.value if hasattr(
                    attempt.status, 'value') else attempt.status,
                score=attempt.score,
                total_marks=attempt.total_marks,
                percentage=attempt.percentage,
                total_violations=attempt.total_violations,
                auto_submitted_due_to_violations=attempt.auto_submitted_due_to_violations,
                started_at=attempt.started_at,
                submitted_at=attempt.submitted_at,
                archived_at=datetime.utcnow(),
                is_active=False  # Mark as inactive since it's reset
            )
            db.session.add(history)

            # Mark attempt as reset
            attempt.is_reset = True
            attempt.reset_by = reset_by
            attempt.reset_at = datetime.utcnow()
            attempt.reset_reason = reason
            attempt.original_max_attempts = quiz.max_attempts
            attempt.additional_attempts_granted = additional_attempts

        db.session.commit()

        # Send notification to student
        NotificationService.notify_attempt_reset(
            student_id=student_id,
            quiz_title=quiz.title,
            additional_attempts=additional_attempts,
            reason=reason
        )

        # Log audit trail
        audit = AuditLog(
            user_id=reset_by,
            action='attempt_reset',
            entity_type='quiz_attempt',
            entity_id=quiz_id,
            old_value={'attempts': len(
                attempts), 'max_attempts': quiz.max_attempts},
            new_value={
                'additional_attempts_granted': additional_attempts,
                'reason': reason,
                'reset_for': user.name
            }
        )
        db.session.add(audit)
        db.session.commit()

        return {
            'success': True,
            'message': f'Successfully granted {additional_attempts} additional attempt(s) to {user.name}',
            'new_max_attempts': quiz.max_attempts + additional_attempts,
            'archived_attempts': len(attempts)
        }

    @staticmethod
    def reset_quiz_attempts(
        quiz_id: str,
        additional_attempts: int,
        reset_by: str,
        reason: str
    ) -> Dict[str, Any]:
        """Reset attempts for every student who has attempted the quiz."""

        quiz = Quiz.query.get(quiz_id)
        if not quiz:
            raise ValueError('Quiz not found')

        student_rows = db.session.query(QuizAttempt.student_id).filter_by(
            quiz_id=quiz_id
        ).distinct().all()

        student_ids = [row[0] for row in student_rows]

        if not student_ids:
            return {
                'success': False,
                'message': 'No attempts found for this quiz to reset',
                'processed_students': 0,
                'quiz_title': quiz.title,
                'details': []
            }

        processed = []
        for student_id in student_ids:
            result = AttemptResetService.reset_student_attempts(
                student_id=student_id,
                quiz_id=quiz_id,
                additional_attempts=additional_attempts,
                reset_by=reset_by,
                reason=reason
            )
            processed.append({
                'student_id': student_id,
                'message': result.get('message')
            })

        return {
            'success': True,
            'message': f'Successfully reset attempts for {len(student_ids)} student(s)',
            'processed_students': len(student_ids),
            'quiz_title': quiz.title,
            'details': processed
        }

    @staticmethod
    def get_attempt_history(student_id: str, quiz_id: str):
        """Get all attempts including archived ones"""
        # Current attempts
        current_attempts = QuizAttempt.query.filter_by(
            student_id=student_id,
            quiz_id=quiz_id
        ).all()

        # Archived attempts
        archived_attempts = AttemptHistory.query.filter_by(
            student_id=student_id,
            quiz_id=quiz_id
        ).order_by(AttemptHistory.archived_at.desc()).all()

        return {
            'current_attempts': [a.to_dict() for a in current_attempts],
            'archived_attempts': [a.to_dict() for a in archived_attempts]
        }

    @staticmethod
    def get_student_available_attempts(student_id: str, quiz_id: str) -> int:
        """Calculate how many attempts student has left"""
        quiz = Quiz.query.get(quiz_id)
        if not quiz:
            return 0

        # Get all attempts (including reset ones)
        attempts = QuizAttempt.query.filter_by(
            student_id=student_id,
            quiz_id=quiz_id,
            is_reset=False  # Only count non-reset attempts
        ).all()

        # Check if any attempts have been reset and granted additional attempts
        reset_attempts = QuizAttempt.query.filter_by(
            student_id=student_id,
            quiz_id=quiz_id,
            is_reset=True
        ).order_by(QuizAttempt.reset_at.desc()).first()

        total_allowed = quiz.max_attempts
        if reset_attempts and reset_attempts.additional_attempts_granted:
            total_allowed += reset_attempts.additional_attempts_granted

        used_attempts = len(attempts)
        remaining = max(0, total_allowed - used_attempts)

        return remaining

    @staticmethod
    def separate_submissions_for_teacher(quiz_id: str):
        """
        Separate auto-submitted and manually submitted attempts for teacher view
        """
        all_attempts = QuizAttempt.query.filter_by(quiz_id=quiz_id).all()

        auto_submitted = []
        manual_submitted = []
        in_progress = []

        for attempt in all_attempts:
            if attempt.status.value == 'in_progress':
                in_progress.append(attempt.to_dict())
            elif attempt.auto_submitted_due_to_violations:
                auto_submitted.append(attempt.to_dict())
            elif attempt.status.value in ['submitted', 'graded']:
                manual_submitted.append(attempt.to_dict())

        return {
            'in_progress': in_progress,
            'auto_submitted': auto_submitted,
            'manual_submitted': manual_submitted,
            'total': len(all_attempts)
        }

    @staticmethod
    def get_student_attempt_summary(student_id: str, quiz_id: str):
        """Get comprehensive attempt summary for a student"""
        quiz = Quiz.query.get(quiz_id)
        if not quiz:
            return None

        # Get available attempts
        remaining_attempts = AttemptResetService.get_student_available_attempts(
            student_id, quiz_id)

        # Get latest attempt
        latest_attempt = QuizAttempt.query.filter_by(
            student_id=student_id,
            quiz_id=quiz_id
        ).order_by(QuizAttempt.started_at.desc()).first()

        # Check for reset history
        reset_attempt = QuizAttempt.query.filter_by(
            student_id=student_id,
            quiz_id=quiz_id,
            is_reset=True
        ).order_by(QuizAttempt.reset_at.desc()).first()

        additional_granted = 0
        if reset_attempt:
            additional_granted = reset_attempt.additional_attempts_granted or 0

        current_attempts = QuizAttempt.query.filter_by(
            student_id=student_id,
            quiz_id=quiz_id,
            is_reset=False
        ).count()

        return {
            'quiz_id': quiz_id,
            'quiz_title': quiz.title,
            'max_attempts': quiz.max_attempts,
            'additional_attempts_granted': additional_granted,
            'total_allowed': quiz.max_attempts + additional_granted,
            'used_attempts': current_attempts,
            'remaining_attempts': remaining_attempts,
            'latest_attempt': latest_attempt.to_dict() if latest_attempt else None,
            'has_been_reset': reset_attempt is not None,
            'last_reset': reset_attempt.reset_at.isoformat() if reset_attempt else None,
            'reset_reason': reset_attempt.reset_reason if reset_attempt else None
        }
