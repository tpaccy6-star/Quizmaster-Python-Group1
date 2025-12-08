# Notification Service
# Module Owner: Student 6 - Communication Specialist

# Handles all notification-related business logic

from datetime import datetime, timedelta
from app import db
from app.models.notification import Notification
from app.models.notification_event import NotificationEvent
from app.models.user import User


class NotificationService:

    @staticmethod
    def create_notification(user_id, notification_type, title, message, **kwargs):
        """Create a new notification"""
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            link=kwargs.get('link'),
            priority=kwargs.get('priority', 'medium'),
            category=kwargs.get('category', 'system'),
            action_url=kwargs.get('action_url'),
            expires_at=kwargs.get('expires_at'),
            extra_data=kwargs.get('extra_data', {})
        )

        db.session.add(notification)
        db.session.commit()

        return notification

    @staticmethod
    def get_user_notifications(user_id, unread_only=False, limit=50, category=None):
        """Get notifications for a user"""
        query = Notification.query.filter_by(user_id=user_id)

        if unread_only:
            query = query.filter_by(is_read=False)

        if category:
            query = query.filter_by(category=category)

        notifications = query.order_by(
            Notification.created_at.desc()
        ).limit(limit).all()

        return notifications

    @staticmethod
    def get_unread_count(user_id):
        """Get unread notifications count for a user"""
        return Notification.query.filter_by(user_id=user_id, is_read=False).count()

    @staticmethod
    def mark_as_read(notification_id):
        """Mark a notification as read"""
        notification = Notification.query.get(notification_id)

        if notification:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            db.session.commit()

        return notification

    @staticmethod
    def mark_all_as_read(user_id):
        """Mark all notifications as read for a user"""
        notifications = Notification.query.filter_by(
            user_id=user_id,
            is_read=False
        ).all()

        for notification in notifications:
            notification.is_read = True
            notification.read_at = datetime.utcnow()

        db.session.commit()

    @staticmethod
    def delete_notification(notification_id):
        """Delete a notification"""
        notification = Notification.query.get(notification_id)

        if notification:
            db.session.delete(notification)
            db.session.commit()

        return notification

    @staticmethod
    def cleanup_expired_notifications():
        """Clean up expired notifications"""
        expired = Notification.query.filter(
            Notification.expires_at < datetime.utcnow()
        ).all()

        for notification in expired:
            db.session.delete(notification)

        db.session.commit()

        return len(expired)

    @staticmethod
    def create_bulk_notifications(user_ids, notification_type, title, message, **kwargs):
        """Create notifications for multiple users"""
        notifications = []

        for user_id in user_ids:
            notification = Notification(
                user_id=user_id,
                type=notification_type,
                title=title,
                message=message,
                link=kwargs.get('link'),
                priority=kwargs.get('priority', 'medium'),
                category=kwargs.get('category', 'system'),
                action_url=kwargs.get('action_url'),
                expires_at=kwargs.get('expires_at'),
                extra_data=kwargs.get('extra_data', {})
            )
            notifications.append(notification)

        db.session.add_all(notifications)
        db.session.commit()

        return notifications

    @staticmethod
    def notify_quiz_published(quiz_id, quiz_title, subject, class_ids):
        """Notify students about a new quiz"""
        from app.models.student import Student

        # Get all students in the specified classes
        students = Student.query.filter(Student.class_id.in_(class_ids)).all()

        if not students:
            return []

        # Create notifications
        notifications = NotificationService.create_bulk_notifications(
            user_ids=[s.id for s in students],
            notification_type='quiz_published',
            title=f'New Quiz: {quiz_title}',
            message=f'A new quiz has been published for {subject}. Click to view details.',
            link=f'/quiz/{quiz_id}',
            category='quiz',
            priority='high',
            expires_at=datetime.utcnow() + timedelta(days=7)
        )

        # Log the notification event
        event = NotificationEvent(
            event_type='quiz_published',
            entity_type='quiz',
            entity_id=quiz_id,
            recipients=[s.id for s in students],
            notification_template='quiz_published',
            extra_data={
                'quiz_title': quiz_title,
                'subject': subject,
                'class_ids': class_ids
            }
        )
        db.session.add(event)
        db.session.commit()

        return notifications

    @staticmethod
    def notify_grade_published(attempt_id, score, passed):
        """Notify student about graded quiz"""
        from app.models.quiz_attempt import QuizAttempt

        attempt = QuizAttempt.query.get(attempt_id)

        if not attempt or not attempt.student_id:
            return None

        title = 'Quiz Graded' if passed else 'Quiz Graded - Review Required'
        message = f'Your quiz has been graded. Score: {score}%. {"Congratulations!" if passed else "Please review your answers."}'

        notification = NotificationService.create_notification(
            user_id=attempt.student_id,
            notification_type='quiz_graded',
            title=title,
            message=message,
            link=f'/results/{attempt_id}',
            category='grade',
            priority='medium',
            extra_data={
                'attempt_id': attempt_id,
                'score': score,
                'passed': passed
            }
        )

        return notification

    @staticmethod
    def notify_attempt_reset(student_id, quiz_id, additional_attempts, reason):
        """Notify student about attempt reset"""
        title = 'Quiz Attempts Reset'
        message = f'You have been granted {additional_attempts} additional attempt(s) for the quiz. Reason: {reason}'

        notification = NotificationService.create_notification(
            user_id=student_id,
            notification_type='attempt_reset',
            title=title,
            message=message,
            link=f'/quiz/{quiz_id}',
            category='attempt_reset',
            priority='high',
            extra_data={
                'quiz_id': quiz_id,
                'additional_attempts': additional_attempts,
                'reason': reason
            }
        )

        return notification

    @staticmethod
    def notify_violation_detected(student_id, violation_type, quiz_id):
        """Notify student about violation detected"""
        title = 'Quiz Violation Detected'
        message = f'A violation ({violation_type}) was detected during your quiz attempt.'

        notification = NotificationService.create_notification(
            user_id=student_id,
            notification_type='violation',
            title=title,
            message=message,
            link=f'/quiz/{quiz_id}',
            category='violation',
            priority='high',
            extra_data={
                'quiz_id': quiz_id,
                'violation_type': violation_type
            }
        )

        return notification

    @staticmethod
    def get_notification_stats(user_id):
        """Get notification statistics for a user"""
        total = Notification.query.filter_by(user_id=user_id).count()
        unread = Notification.query.filter_by(
            user_id=user_id, is_read=False).count()

        # Count by category
        categories = db.session.query(
            Notification.category,
            db.func.count(Notification.id).label('count')
        ).filter_by(user_id=user_id).group_by(Notification.category).all()

        category_counts = {cat: count for cat, count in categories}

        return {
            'total': total,
            'unread': unread,
            'categories': category_counts
        }
