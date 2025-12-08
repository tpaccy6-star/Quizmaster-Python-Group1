# QuizMaster Backend - Modular Architecture Documentation

## Overview
The QuizMaster backend is structured into 7 distinct modules, each assigned to a team member for presentation. Each module contains:
- **Service Layer**: Business logic and database operations
- **Controller Layer**: HTTP request handling and API endpoints
- **Models**: Database models (shared across modules)

## Module Structure

### 1. Authentication Module (`app/modules/auth/`)
**Module Owner**: Student 1 - Authentication Specialist

**Responsibilities**:
- User registration and login
- JWT token management (access/refresh tokens)
- Password reset functionality
- User profile management

**Key Services**:
- `AuthService.register_user()`: Register new users with role-specific data
- `AuthService.authenticate_user()`: Login and generate tokens
- `AuthService.refresh_access_token()`: Refresh JWT tokens
- `AuthService.request_password_reset()`: Generate OTP for password reset
- `AuthService.reset_password()`: Reset password with OTP

**API Endpoints**:
- `POST /api/auth/register`: Register new user
- `POST /api/auth/login`: User login
- `POST /api/auth/refresh`: Refresh access token
- `POST /api/auth/logout`: User logout
- `GET /api/auth/me`: Get current user profile
- `POST /api/auth/forgot-password`: Request password reset
- `POST /api/auth/reset-password`: Reset password
- `POST /api/auth/change-password`: Change password

### 2. Admin Module (`app/modules/admin/`)
**Module Owner**: Student 2 - System Administrator

**Responsibilities**:
- User management (activate/deactivate users)
- Class management
- System statistics and dashboard
- Audit log management

**Key Services**:
- `AdminService.get_all_users()`: Get all users with filtering
- `AdminService.toggle_user_status()`: Activate/deactivate users
- `AdminService.create_class()`: Create new classes
- `AdminService.get_dashboard_stats()`: System statistics
- `AdminService.get_audit_logs()`: System audit logs

**API Endpoints**:
- `GET /api/admin/users`: Get all users
- `GET /api/admin/users/<id>`: Get specific user
- `POST /api/admin/users/<id>/toggle-active`: Toggle user status
- `GET /api/admin/classes`: Get all classes
- `POST /api/admin/classes`: Create new class
- `GET /api/admin/dashboard/stats`: Dashboard statistics
- `GET /api/admin/audit-logs`: Get audit logs

### 3. Teacher Module (`app/modules/teacher/`)
**Module Owner**: Student 3 - Quiz Management Specialist

**Responsibilities**:
- Teacher dashboard
- Class and student management
- Quiz grading
- Class assignments

**Key Services**:
- `TeacherService.getombs.get_teacher_dashboard()`: Teacher dashboard data
- `TeacherService.get_teacher_classes()`: Get assigned classes
- `TeacherService.get_teacher_students()`: Get enrolled students students
- `TeacherService.get_pending_grading()`: Attempts needing grading
- `TeacherService.grade_student_answer()`: Grade individual answers

**API Endpoints**:
- `GET /api/teacher/dashboard`: Teacher dashboard
- `GET /api/teacher/classes`: Get teacher's classes
- `GET /api/teacher/students`: Get teacher's students
- `GET /api/teacher/quizzes`: Get teacher's quizzes
- `GET /api/teacher/grading/pending`: Get pending grading
- `POST /api/teacher/grade-answer`: Grade student answer
- `POST /api/teacher/classes/<id>/assign`: Assign to class
- `POST /api/teacher/classes/<id>/remove`: Remove from class

### 4. Student Module (`app/modules/student/`)
**Module Owner**: Student 4 - Student Experience Specialist

**Responsibilities**:
- Student dashboard
- Quiz attempts
- Results viewing
- Profile management

**Key Services**:
- `StudentService.get_student_dashboard()`: Student dashboard
- `StudentService.get_available_quizzes()`: Available quizzes
- `StudentService.start_quiz_attempt()`: Start new attempt
- `StudentService.submit_answer()`: Submit quiz answers
- `StudentService.submit_quiz_attempt()`: Complete quiz

**API Endpoints**:
- `GET /api/student/dashboard`: Student dashboard
- `GET /api/student/quizzes`: Available quizzes
- `GET /api/student/results`: Quiz results
- `POST /api/student/quiz/<id>/start`: Start quiz
- `POST /api/student/attempt/<id>/answer`: Submit answer
- `POST /api/student/attempt/<id>/submit`: Submit quiz
- `PUT /api/student/profile`: Update profile

### 5. Quiz Module (`app/modules/quiz/`)
**Module Owner**: Student 5 - Question Bank Specialist

**Responsibilities**:
- Quiz creation and management
- Question bank management
- Quiz publishing
- Access code generation

**Key Services**:
- `QuizService.create_quiz()`: Create new quiz
- `QuizService.update_quiz()`: Update quiz details
- `QuizService.publish_quiz()`: Publish quiz to students
- `QuizService.add_question_to_quiz()`: Add questions
- `QuizService.create_question()`: Create questions
- `QuizService.get_question_bank()`: Get question bank

**API Endpoints**:
- `GET /api/quizzes/`: Get quizzes (role-based)
- `POST /api/quizzes/`: Create new quiz
- `GET /api/quizzes/<id>`: Get specific quiz
- `PUT /api/quizzes/<id>`: Update quiz
- `POST /api/quizzes/<id>/publish`: Publish quiz
- `POST /api/quizzes/<id>/questions`: Add question
- `DELETE /api/quizzes/<id>/questions/<qid>`: Remove question
- `GET /api/quizzes/questions`: Get question bank
- `POST /api/quizzes/questions`: Create question

### 6. Notifications Module (`app/modules/notifications/`)
**Module Owner**: Student 6 - Communication Specialist

**Responsibilities**:
- Notification management
- Real-time notifications
- Notification templates
- Bulk notifications

**Key Services**:
- `NotificationService.create_notification()`: Create notification
- `NotificationService.get_user_notifications()`: Get user notifications
- `NotificationService.mark_as_read()`: Mark as read
- `NotificationService.notify_quiz_published()`: Quiz published notification
- `NotificationService.notify_grade_published()`: Grade notification

**API Endpoints**:
- `GET /api/notifications/`: Get notifications
- `POST /api/notifications/<id>/read`: Mark as read
- `POST /api/notifications/read-all`: Mark all as read
- `DELETE /api/notifications/<id>`: Delete notification
- `GET /api/notifications/unread-count`: Get unread count
- `GET /api/notifications/stats`: Notification statistics
- `POST /api/notifications/bulk`: Create bulk notifications

### 7. Attempts Module (`app/modules/attempts/`)
**Module Owner**: Student 7 - Attempt Management Specialist

**Responsibilities**:
- Quiz attempt tracking
- Violation monitoring
- Attempt resets
- Attempt analytics

**Key Services**:
- `AttemptService.get_attempt_by_id()`: Get attempt details
- `AttemptService.record_violation()`: Record violations
- `AttemptService.get_attempt_violations()`: Get violations
- `AttemptService.get_attempt_statistics()`: Attempt statistics
- `AttemptService.get_categorized_attempts()`: Categorized attempts

**API Endpoints**:
- `GET /api/attempts/<id>`: Get attempt
- `GET /api/attempts/student/<id>`: Get student attempts
- `GET /api/attempts/quiz/<id>`: Get quiz attempts
- `GET /api/attempts/<id>/violations`: Get violations
- `POST /api/attempts/<id>/violations`: Record violation
- `GET /api/attempts/quiz/<id>/stats`: Attempt statistics
- `GET /api/attempts/student/<id>/quiz/<qid>/summary`: Attempt summary
- `GET /api/attempts/quiz/<id>/categorized`: Categorized attempts

## Database Models

### Core Models
- **User**: Base user model with authentication
- **Teacher**: Teacher-specific profile
- **Student**: Student-specific profile
- **Class**: Class/section management
- **Quiz**: Quiz definitions
- **Question**: Question bank
- **QuizAttempt**: Student quiz attempts
- **Notification**: User notifications
- **Violation**: Quiz violations

## API Response Format

All API endpoints follow consistent response format:

**Success Response**:
```json
{
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Response**:
```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```

**Paginated Response**:
```json
{
  "items": [ ... ],
  "total": 100,
  "pages": 10,
  "current_page": 1
}
```

## Authentication Flow

1. User registers/login via `/api/auth/*` endpoints
2. JWT access token and refresh token returned
3. Include access token in `Authorization: Bearer <token>` header
4. Use refresh token to get new access token when expired

## Role-Based Access

- **Admin**: Full system access
- **Teacher**: Access to assigned classes and their quizzes
- **Student**: Access to assigned quizzes and their attempts

## Real-time Features

- **WebSocket Events**: Quiz status updates, new notifications
- **Violation Detection**: Real-time monitoring during quizzes
- **Live Notifications**: Instant notification delivery

## Testing Data

Use the seeded data for testing:
- Admin: `admin@quizmaster.com / admin123`
- Teacher: `john.smith@school.edu / teacher123`
- Student: `student01@school.edu / student123`

## Development Guidelines

1. **Service Layer**: Contains all business logic
2. **Controller Layer**: Only handles HTTP requests/responses
3. **Error Handling**: Use try-catch and return appropriate HTTP status codes
4. **Validation**: Validate input data in controllers
5. **Database**: Use SQLAlchemy ORM for all database operations
