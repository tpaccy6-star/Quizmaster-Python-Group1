import unittest
from unittest.mock import MagicMock, patch
import json
import os
from app import create_app, db
from app.models.user import User, UserRole
from app.models.password_reset_token import PasswordResetToken

class TestPasswordReset(unittest.TestCase):
    def setUp(self):
        # Override environment variable to use sqlite for testing
        os.environ['DATABASE_URL'] = 'sqlite:///:memory:'

        self.app = create_app('testing')
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
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

    def test_forgot_password_returns_token_currently(self):
        # This test verifies the current behavior (returning token in JSON)
        # We'll expect this to fail or change after our implementation
        response = self.client.post('/api/auth/forgot-password',
                                    data=json.dumps({'email': 'test@example.com'}),
                                    content_type='application/json')

        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('token', data)
        self.assertIn('message', data)
        print(f"\nCurrent response data: {data}")

if __name__ == '__main__':
    unittest.main()
