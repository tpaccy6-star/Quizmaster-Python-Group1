
import unittest
from unittest.mock import MagicMock, patch
from datetime import datetime
from app import create_app, db, socketio
from app.services.notification_service import NotificationService
from app.models.notification import Notification

class TestNotificationSocket(unittest.TestCase):
    def setUp(self):
        self.app = create_app('testing')
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()

        # Mock socketio
        self.original_emit = socketio.emit
        socketio.emit = MagicMock()

    def tearDown(self):
        socketio.emit = self.original_emit
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_create_notification_emits_socket_event(self):
        user_id = "test_user_1"
        title = "Test Notification"
        message = "This is a test notification"

        notification = NotificationService.create_notification(
            user_id=user_id,
            notification_type="system",
            title=title,
            message=message
        )

        # Verify emit was called
        socketio.emit.assert_called_once()
        args, kwargs = socketio.emit.call_args
        self.assertEqual(args[0], 'new_notification')
        self.assertEqual(kwargs['room'], user_id)
        self.assertEqual(args[1]['title'], title)
        self.assertEqual(args[1]['message'], message)
        self.assertIsNotNone(args[1].get('id'))

    def test_create_notifications_bulk_emits_socket_events(self):
        user_ids = ["user1", "user2"]
        notification_type = "student_added"
        template_data = {
            "student_name": "John Doe",
            "class_name": "Math 101"
        }

        notifications = NotificationService.create_notifications_bulk(
            user_ids=user_ids,
            notification_type=notification_type,
            template_data=template_data
        )

        # Verify emit was called for each user
        self.assertEqual(socketio.emit.call_count, 2)

        # Check calls
        calls = socketio.emit.call_args_list
        rooms = [call.kwargs['room'] for call in calls]
        self.assertIn("user1", rooms)
        self.assertIn("user2", rooms)

        # Check that emitted data has IDs
        for call in calls:
            self.assertIsNotNone(call.args[1].get('id'), "Notification ID should be present in emitted event")

if __name__ == '__main__':
    unittest.main()
