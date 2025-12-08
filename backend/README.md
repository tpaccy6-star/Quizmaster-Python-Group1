# QuizMaster Backend API

A comprehensive Flask-based backend API for the QuizMaster quiz management system with MySQL database, JWT authentication, real-time notifications, and advanced attempt tracking.

## Features

- **Role-based Authentication** (Admin, Teacher, Student)
- **JWT Token Management** with refresh tokens
- **Comprehensive Quiz Management** with multiple question types
- **Real-time Notifications** system
- **Attempt Reset & History Tracking**
- **Anti-cheating Violation Tracking**
- **Audit Logging** for all actions
- **RESTful API** with proper error handling
- **Database Migrations** support

## Technology Stack

- **Flask 3.0** - Web framework
- **Flask-SQLAlchemy** - ORM
- **Flask-JWT-Extended** - Authentication
- **Flask-SocketIO** - Real-time features
- **MySQL 8.0+** - Database
- **Redis** - Caching (optional)
- **Marshmallow** - Serialization

## Quick Start

### 1. Prerequisites

- Python 3.8+
- MySQL 8.0+
- Redis (optional, for caching)

### 2. Installation

```bash
# Clone the repository
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Unix/MacOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Database Setup

```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE quiz_management_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Import schema
mysql -u root -p quiz_management_db < database_schema.sql

# Or run the SQL file directly in your MySQL client
```

### 4. Configuration

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# DATABASE_URL=mysql://username:password@localhost/quiz_management_db
# SECRET_KEY=your-secret-key
# JWT_SECRET_KEY=your-jwt-secret
```

### 5. Run the Application

```bash
# Development server
python run.py

# Or using Flask directly
flask run --host=127.0.0.1 --port=5000
```

The API will be available at `http://localhost:5000`

## API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | User logout |
| GET | `/api/auth/me` | Get current user profile |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password |
| POST | `/api/auth/change-password` | Change password |

### Quiz Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quizzes` | Get quizzes (filtered by role) |
| POST | `/api/quizzes` | Create new quiz (Teacher) |
| GET | `/api/quizzes/{id}` | Get specific quiz |
| PUT | `/api/quizzes/{id}` | Update quiz (Teacher) |
| POST | `/api/quizzes/{id}/publish` | Publish quiz (Teacher) |

### Notification Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get user notifications |
| POST | `/api/notifications/{id}/read` | Mark as read |
| POST | `/api/notifications/read-all` | Mark all as read |
| DELETE | `/api/notifications/{id}` | Delete notification |
| GET | `/api/notifications/unread-count` | Get unread count |

### Attempt Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/attempts/reset` | Reset student attempts (Teacher) |
| GET | `/api/attempts/history` | Get attempt history |
| GET | `/api/attempts/available` | Get available attempts (Student) |
| GET | `/api/attempts/quiz/{id}/categorized` | Get categorized attempts (Teacher) |
| GET | `/api/attempts/summary` | Get attempt summary (Student) |

### Role-specific Endpoints

#### Admin (`/api/admin/*`)
- GET `/users` - Get all users
- GET `/users/{id}` - Get specific user
- POST `/users/{id}/toggle-active` - Toggle user status
- GET `/classes` - Get all classes
- POST `/classes` - Create class
- GET `/dashboard/stats` - Get dashboard statistics

#### Teacher (`/api/teacher/*`)
- GET `/dashboard` - Get teacher dashboard
- GET `/classes` - Get teacher's classes
- GET `/students` - Get teacher's students
- GET `/quizzes` - Get teacher's quizzes
- GET `/grading/pending` - Get pending grading

#### Student (`/api/student/*`)
- GET `/dashboard` - Get student dashboard
- GET `/quizzes` - Get available quizzes
- GET `/results` - Get student results
- PUT `/profile` - Update student profile

## Database Schema

The application uses a comprehensive MySQL schema with the following key tables:

- **users** - Base user table with authentication
- **teachers** - Teacher-specific information
- **students** - Student-specific information
- **classes** - Class management
- **quizzes** - Quiz definitions
- **questions** - Question bank
- **quiz_attempts** - Student quiz attempts
- **notifications** - User notifications
- **attempt_history** - Archived attempt data
- **audit_logs** - System audit trail

See `database_schema.sql` for the complete schema definition.

## Security Features

- **JWT Authentication** with access/refresh tokens
- **Password Hashing** using bcrypt
- **Role-based Access Control** (RBAC)
- **CORS Protection** for frontend integration
- **Rate Limiting** to prevent abuse
- **Input Validation** and sanitization
- **SQL Injection Protection** via ORM
- **Audit Logging** for security monitoring

## Notification System

The backend includes a comprehensive notification system:

- **Template-based notifications** for common events
- **Bulk notifications** for class-wide announcements
- **Priority levels** (low, medium, high)
- **Categories** (quiz, grade, system, violation)
- **Expiration** support for time-sensitive notifications
- **Real-time delivery** via SocketIO (planned)

## Attempt Reset System

Advanced attempt management features:

- **Archive attempts** before reset
- **Grant additional attempts** with reasons
- **Track reset history** with audit trail
- **Separate auto-submitted** from manual submissions
- **Comprehensive attempt analytics**

## Development

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-flask pytest-cov

# Run tests
pytest

# Run with coverage
pytest --cov=app
```

### Database Migrations

```bash
# Initialize migrations
flask db init

# Create migration
flask db migrate -m "Initial migration"

# Apply migration
flask db upgrade
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | Flask secret key | `dev-secret-key` |
| `JWT_SECRET_KEY` | JWT signing key | `jwt-secret-string` |
| `DATABASE_URL` | MySQL connection string | `mysql://root:password@localhost/quiz_management_db` |
| `FLASK_DEBUG` | Debug mode | `True` |
| `FLASK_HOST` | Server host | `127.0.0.1` |
| `FLASK_PORT` | Server port | `5000` |

## Production Deployment

### Using Gunicorn

```bash
# Install production server
pip install gunicorn gevent

# Run with Gunicorn
gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:5000 run:app
```

### Using Docker

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 5000

CMD ["gunicorn", "--worker-class", "eventlet", "-w", "1", "--bind", "0.0.0.0:5000", "run:app"]
```

## API Response Format

All API responses follow a consistent format:

**Success Response:**
```json
{
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Response:**
```json
{
  "error": "Error description",
  "details": "Additional error details"
}
```

**Paginated Response:**
```json
{
  "items": [ ... ],
  "total": 100,
  "pages": 10,
  "current_page": 1
}
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check MySQL is running
   - Verify DATABASE_URL in .env
   - Ensure database exists

2. **Import Error**
   - Activate virtual environment
   - Install requirements: `pip install -r requirements.txt`

3. **JWT Token Error**
   - Check JWT_SECRET_KEY in .env
   - Verify token expiration settings

4. **CORS Error**
   - Check frontend URL in CORS origins
   - Ensure proper headers in requests

### Logs

Enable debug mode for detailed logs:
```bash
export FLASK_DEBUG=True
python run.py
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License.
