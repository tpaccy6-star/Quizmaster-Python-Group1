from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from app import db
from app.models.notification import Notification
from app.models.notification_event import NotificationEvent
from app.models.user import User

# Notification templates
NOTIFICATION_TEMPLATES = {
    "quiz_published": {
        "title": "New Quiz Available: {quiz_title}",
        "message": "A new quiz '{quiz_title}' for {subject} has been published and is now available.",
        "priority": "medium",
        "category": "quiz"
    },
    "quiz_starting_soon": {
        "title": "Quiz Starting Soon",
        "message": "Quiz '{quiz_title}' will start in {time_until}. Make sure you're prepared!",
        "priority": "high",
        "category": "quiz"
    },
    "quiz_deadline_approaching": {
        "title": "Quiz Deadline Approaching",
        "message": "Quiz '{quiz_title}' deadline is in {time_remaining}. Don't forget to complete it!",
        "priority": "high",
        "category": "quiz"
    },
    "attempt_graded": {
        "title": "Quiz Graded: {quiz_title}",
        "message": "Your submission for '{quiz_title}' has been graded. Score: {score}/{total_marks} ({percentage}%)",
        "priority": "medium",
        "category": "grade"
    },
    "attempt_reset": {
        "title": "Quiz Attempt Reset",
        "message": "Your teacher has granted you {additional_attempts} additional attempt(s) for '{quiz_title}'. Reason: {reason}",
        "priority": "high",
        "category": "attempt_reset"
    },
    "attempt_auto_submitted": {
        "title": "Quiz Auto-Submitted",
        "message": "Your quiz '{quiz_title}' was automatically submitted due to {violations} violation(s).",
        "priority": "high",
        "category": "violation"
    },
    "violation_warning": {
        "title": "Violation Detected",
        "message": "Warning: {violation_type} detected during '{quiz_title}'. Total violations: {total_violations}/3",
        "priority": "high",
        "category": "violation"
    },
    "grade_pending_review": {
        "title": "New Submission to Grade",
        "message": "{student_name} has submitted '{quiz_title}' and requires manual grading.",
        "priority": "medium",
        "category": "grade"
    },
    "student_added": {
        "title": "New Student Added",
        "message": "{student_name} has been added to your class '{class_name}'.",
        "priority": "low",
        "category": "system"
    },
    "account_claimed": {
        "title": "Account Claimed Successfully",
        "message": "Welcome to QuizMaster! Your account has been successfully claimed.",
        "priority": "medium",
        "category": "system"
    }
}


class NotificationService:

    @staticmethod
    def create_notification(
        user_id: str,
        notification_type: str,
        title: str,
        message: str,
        link: Optional[str] = None,
        priority: str = 'medium',
        category: str = 'system',
        metadata: Optional[Dict] = None,
        expires_at: Optional[datetime] = None
    ) -> Notification:
        """Create a single notification"""
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            link=link,
            priority=priority,
            category=category,
            action_url=link,
            metadata=metadata,
            expires_at=expires_at
        )
        db.session.add(notification)
        db.session.commit()

        # TODO: Send real-time notification via WebSocket/SocketIO
        # socketio.emit('new_notification', notification.to_dict(), room=user_id)

        return notification

    @staticmethod
    def create_notifications_bulk(
        user_ids: List[str],
        notification_type: str,
        template_data: Dict[str, Any]
    ):
        """Create notifications for multiple users"""
        template = NOTIFICATION_TEMPLATES.get(notification_type)
        if not template:
            raise ValueError(f"Unknown notification type: {notification_type}")

        title = template['title'].format(**template_data)
        message = template['message'].format(**template_data)

        notifications = []
        for user_id in user_ids:
            notification = Notification(
                user_id=user_id,
                type=notification_type,
                title=title,
                message=message,
                action_url=template_data.get('link'),
                priority=template['priority'],
                category=template['category'],
                metadata=template_data
            )
            notifications.append(notification)

        db.session.bulk_save_objects(notifications)
        db.session.commit()

        return notifications

    @staticmethod
    def notify_quiz_published(quiz_id: str, quiz_title: str, subject: str, class_ids: List[str]):
        """Notify all students in assigned classes when quiz is published"""
        from app.models.student import Student
        from app.models.class_model import Class

        # Get all students in the assigned classes
        students = db.session.query(Student).filter(
            Student.class_id.in_(class_ids)).all()
        student_ids = [s.id for s in students]

        if student_ids:
            NotificationService.create_notifications_bulk(
                user_ids=student_ids,
                notification_type="quiz_published",
                template_data={
                    'quiz_title': quiz_title,
                    'subject': subject,
                    'link': '/student/quizzes'
                }
            )

    @staticmethod
    def notify_attempt_graded(student_id: str, quiz_title: str, score: float, total_marks: int, percentage: float):
        """Notify student when their attempt is graded"""
        NotificationService.create_notifications_bulk(
            user_ids=[student_id],
            notification_type="attempt_graded",
            template_data={
                'quiz_title': quiz_title,
                'score': score,
                'total_marks': total_marks,
                'percentage': f"{percentage:.1f}",
                'link': '/student/results'
            }
        )

    @staticmethod
    def notify_attempt_reset(student_id: str, quiz_title: str, additional_attempts: int, reason: str):
        """Notify student when attempts are reset"""
        NotificationService.create_notifications_bulk(
            user_ids=[student_id],
            notification_type="attempt_reset",
            template_data={
                'quiz_title': quiz_title,
                'additional_attempts': additional_attempts,
                'reason': reason,
                'link': '/student/quizzes'
            }
        )

    @staticmethod
    def notify_auto_submission(student_id: str, quiz_title: str, violations: int):
        """Notify student when quiz is auto-submitted due to violations"""
        NotificationService.create_notifications_bulk(
            user_ids=[student_id],
            notification_type="attempt_auto_submitted",
            template_data={
                'quiz_title': quiz_title,
                'violations': violations,
                'link': '/student/results'
            }
        )

    @staticmethod
    def notify_pending_grading(teacher_id: str, student_name: str, quiz_title: str, attempt_id: str):
        """Notify teacher of pending grading"""
        NotificationService.create_notifications_bulk(
            user_ids=[teacher_id],
            notification_type="grade_pending_review",
            template_data={
                'student_name': student_name,
                'quiz_title': quiz_title,
                'link': f'/teacher/grading?attempt_id={attempt_id}'
            }
        )

    @staticmethod
    def notify_violation(student_id: str, quiz_title: str, violation_type: str, total_violations: int):
        """Notify student of violation"""
        NotificationService.create_notifications_bulk(
            user_ids=[student_id],
            notification_type="violation_warning",
            template_data={
                'quiz_title': quiz_title,
                'violation_type': violation_type.replace('_', ' ').title(),
                'total_violations': total_violations,
                'link': '/student/quizzes'
            }
        )

    @staticmethod
    def get_user_notifications(user_id: str, unread_only: bool = False, limit: int = 50, category: str = None):
        """Get notifications for a user"""
        query = db.session.query(Notification).filter(
            Notification.user_id == user_id)

        if unread_only:
            query = query.filter(Notification.is_read == False)

        if category:
            query = query.filter(Notification.category == category)

        # Filter out expired notifications
        query = query.filter(
            (Notification.expires_at.is_(None)) | (
                Notification.expires_at > datetime.utcnow())
        )

        notifications = query.order_by(
            Notification.created_at.desc()).limit(limit).all()
        return notifications

    @staticmethod
    def mark_as_read(notification_id: str):
        """Mark notification as read"""
        notification = Notification.query.get(notification_id)
        if notification:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            db.session.commit()
        return notification

    @staticmethod
    def mark_all_as_read(user_id: str):
        """Mark all notifications as read for a user"""
        db.session.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({
            'is_read': True,
            'read_at': datetime.utcnow()
        })
        db.session.commit()

    @staticmethod
    def delete_notification(notification_id: str):
        """Delete a notification"""
        notification = Notification.query.get(notification_id)
        if notification:
            db.session.delete(notification)
            db.session.commit()
        return True

    @staticmethod
    def cleanup_expired_notifications():
        """Delete expired notifications (run as cron job)"""
        db.session.query(Notification).filter(
            Notification.expires_at < datetime.utcnow()
        ).delete()
        db.session.commit()

    @staticmethod
    def get_unread_count(user_id: str):
        """Get count of unread notifications for a user"""
        count = db.session.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False,
            (Notification.expires_at.is_(None)) | (
                Notification.expires_at > datetime.utcnow())
        ).count()
        return count
