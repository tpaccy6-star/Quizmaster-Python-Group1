from app import create_app, db
from app.models.user import User

app = create_app()

with app.app_context():
    user = User.query.filter_by(email='admin@quizmaster.com').first()
    if user:
        print(f'User found: {user.name}')
        print(f'Role: {user.role}')
        print(f'Active: {user.is_active}')
        print(
            f'Password check for admin123: {user.check_password("admin123")}')
    else:
        print('User not found')

    # Check all users
    all_users = User.query.all()
    print(f'\nTotal users in database: {len(all_users)}')
    for u in all_users:
        print(f'- {u.email} ({u.role})')
