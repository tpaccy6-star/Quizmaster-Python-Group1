import unittest
from unittest.mock import MagicMock, patch
import json
import os
from app import create_app, db, mail
from app.models.user import User, UserRole
from app.models.password_reset_token import PasswordResetToken

class TestPasswordResetEmail(unittest.TestCase):
    def setUp(self):
        # Override environment variable to use sqlite for testing
        os.environ['DATABASE_URL'] = 'sqlite:///:memory:'

        self.app = create_app('testing')
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        # Don't actually send emails during tests
        self.app.config['MAIL_SUPPRESS_SEND'] = True

        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()

            # Create a test user
            self.user = User(
                email='test@example.com',
                name='Test User',
                role=UserRole.STUDENT
            )
            self.user.set_password('password')
            db.session.add(self.user)
            db.session.commit()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_forgot_password_sends_email_and_hides_token(self):
        with patch('app.routes.auth.mail.send') as mock_send:
            response = self.client.post('/api/auth/forgot-password',
                                        data=json.dumps({'email': 'test@example.com'}),
                                        content_type='application/json')

            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)

            # Verify token is NOT in response
            self.assertNotIn('token', data)
            self.assertEqual(data['message'], 'Password reset token sent to email')

            # Verify email was sent
            self.assertTrue(mock_send.called)
            args, _ = mock_send.call_args
            msg = args[0]
            self.assertEqual(msg.subject, 'Password Reset Token')
            self.assertEqual(msg.recipients, ['test@example.com'])
            self.assertIn('Your password reset token is:', msg.body)

    def test_forgot_password_email_failure(self):
        # Simulate email sending failure
        with patch('app.routes.auth.mail.send') as mock_send:
            mock_send.side_effect = Exception("SMTP Connection Failed")

            response = self.client.post('/api/auth/forgot-password',
                                        data=json.dumps({'email': 'test@example.com'}),
                                        content_type='application/json')

            self.assertEqual(response.status_code, 500)
            data = json.loads(response.data)
            self.assertIn('error', data)
            self.assertEqual(data['error'], 'Failed to send email. Please try again later.')

if __name__ == '__main__':
    unittest.main()
