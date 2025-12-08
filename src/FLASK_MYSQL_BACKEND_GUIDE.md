# Python Backend Development Guide - Flask + MySQL

**Version:** 1.0  
**Date:** December 6, 2025  
**Framework:** Flask  
**Database:** MySQL 8.0+

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Database Schema (MySQL)](#database-schema-mysql)
4. [Project Structure](#project-structure)
5. [API Endpoints](#api-endpoints)
6. [Authentication & Authorization](#authentication--authorization)
7. [Security Implementation](#security-implementation)
8. [Real-time Features](#real-time-features)
9. [File Upload & Processing](#file-upload--processing)
10. [Implementation Steps](#implementation-steps)
11. [Testing Strategy](#testing-strategy)
12. [Deployment Guide](#deployment-guide)

---

## 1. System Overview

### Current Frontend Architecture
- **Framework:** React 18 with TypeScript
- **Routing:** React Router v6
- **State Management:** React useState/useEffect (local state)
- **UI Library:** Shadcn UI + Tailwind CSS
- **Data:** Currently using mock data in `/lib/mockData.ts`

### Backend Requirements
- Replace mock data with MySQL database
- Implement secure authentication (JWT with Flask-JWT-Extended)
- Handle file uploads (CSV for students)
- Real-time quiz monitoring (Flask-SocketIO)
- Anti-cheating violation tracking
- Export/print report generation
- Role-based access control (RBAC)

---

## 2. Technology Stack

### Flask + MySQL Stack

```python
# Core Framework
Flask==3.0.0
Flask-SQLAlchemy==3.1.1
Flask-Migrate==4.0.5
mysqlclient==2.2.1  # MySQL adapter
# OR
PyMySQL==1.1.0  # Pure Python MySQL client

# Authentication & Security
Flask-JWT-Extended==4.6.0
Flask-Bcrypt==1.0.1
python-dotenv==1.0.0

# CORS
Flask-CORS==4.0.0

# Real-time
Flask-SocketIO==5.3.6
python-socketio==5.11.0
python-engineio==4.8.0

# File Processing
pandas==2.1.4
openpyxl==3.1.2
reportlab==4.0.8

# Email
Flask-Mail==0.9.1

# Validation
marshmallow==3.20.1
Flask-Marshmallow==0.15.0
marshmallow-sqlalchemy==0.29.0

# API Documentation
flask-swagger-ui==4.11.1
flasgger==0.9.7.1

# Rate Limiting
Flask-Limiter==3.5.0

# Caching (optional)
Flask-Caching==2.1.0
redis==5.0.1

# Testing
pytest==7.4.3
pytest-flask==1.3.0
pytest-cov==4.1.0

# Production Server
gunicorn==21.2.0
gevent==23.9.1  # For SocketIO
```

### Requirements.txt

```txt
Flask==3.0.0
Flask-SQLAlchemy==3.1.1
Flask-Migrate==4.0.5
Flask-JWT-Extended==4.6.0
Flask-Bcrypt==1.0.1
Flask-CORS==4.0.0
Flask-SocketIO==5.3.6
Flask-Mail==0.9.1
Flask-Marshmallow==0.15.0
Flask-Limiter==3.5.0
Flask-Caching==2.1.0
mysqlclient==2.2.1
marshmallow==3.20.1
marshmallow-sqlalchemy==0.29.0
python-dotenv==1.0.0
pandas==2.1.4
openpyxl==3.1.2
reportlab==4.0.8
redis==5.0.1
flasgger==0.9.7.1
gunicorn==21.2.0
gevent==23.9.1
pytest==7.4.3
pytest-flask==1.3.0
pytest-cov==4.1.0
```

---

## 3. Database Schema (MySQL)

### 3.1 MySQL Schema

```sql
-- ============================================
-- DATABASE CREATION
-- ============================================
CREATE DATABASE IF NOT EXISTS quiz_management_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE quiz_management_db;

-- ============================================
-- USERS TABLE (Base table for all users)
-- ============================================
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'teacher', 'student') NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TEACHERS TABLE
-- ============================================
CREATE TABLE teachers (
    id CHAR(36) PRIMARY KEY,
    subject VARCHAR(100),
    phone VARCHAR(20),
    department VARCHAR(100),
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_subject (subject)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- CLASSES TABLE
-- ============================================
CREATE TABLE classes (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    section VARCHAR(50),
    academic_year VARCHAR(20),
    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_class (name, section, academic_year),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STUDENTS TABLE
-- ============================================
CREATE TABLE students (
    id CHAR(36) PRIMARY KEY,
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    class_id CHAR(36),
    date_of_birth DATE,
    parent_email VARCHAR(255),
    parent_phone VARCHAR(20),
    is_account_claimed BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
    INDEX idx_reg_number (registration_number),
    INDEX idx_class_id (class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TEACHER_CLASSES (Many-to-Many)
-- ============================================
CREATE TABLE teacher_classes (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    teacher_id CHAR(36) NOT NULL,
    class_id CHAR(36) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_teacher_class (teacher_id, class_id),
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_class_id (class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- QUIZZES TABLE
-- ============================================
CREATE TABLE quizzes (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    description TEXT,
    access_code VARCHAR(20) UNIQUE NOT NULL,
    time_limit_minutes INT NOT NULL CHECK (time_limit_minutes > 0),
    status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
    start_date TIMESTAMP NULL,
    end_date TIMESTAMP NULL,
    created_by CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Quiz settings
    passing_percentage INT DEFAULT 40 CHECK (passing_percentage >= 0 AND passing_percentage <= 100),
    max_attempts INT DEFAULT 1 CHECK (max_attempts > 0),
    show_answers_after_submission BOOLEAN DEFAULT FALSE,
    randomize_questions BOOLEAN DEFAULT FALSE,
    randomize_options BOOLEAN DEFAULT FALSE,
    allow_review BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (created_by) REFERENCES teachers(id) ON DELETE CASCADE,
    INDEX idx_created_by (created_by),
    INDEX idx_status (status),
    INDEX idx_access_code (access_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- QUIZ_CLASSES (Many-to-Many)
-- ============================================
CREATE TABLE quiz_classes (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    quiz_id CHAR(36) NOT NULL,
    class_id CHAR(36) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_quiz_class (quiz_id, class_id),
    INDEX idx_quiz_id (quiz_id),
    INDEX idx_class_id (class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- QUESTIONS TABLE (Question Bank)
-- ============================================
CREATE TABLE questions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    text TEXT NOT NULL,
    type ENUM('mcq', 'descriptive', 'true_false', 'short_answer') NOT NULL,
    topic VARCHAR(100),
    difficulty ENUM('easy', 'medium', 'hard'),
    marks INT NOT NULL CHECK (marks > 0),
    created_by CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- For MCQ questions (stored as JSON)
    options JSON,  -- ["Option 1", "Option 2", ...]
    correct_answer INT,  -- Index of correct option (0-based)
    
    -- For descriptive questions
    sample_answer TEXT,
    marking_rubric TEXT,
    
    FOREIGN KEY (created_by) REFERENCES teachers(id) ON DELETE CASCADE,
    INDEX idx_created_by (created_by),
    INDEX idx_type (type),
    INDEX idx_topic (topic),
    INDEX idx_difficulty (difficulty)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- QUIZ_QUESTIONS (Many-to-Many)
-- ============================================
CREATE TABLE quiz_questions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    quiz_id CHAR(36) NOT NULL,
    question_id CHAR(36) NOT NULL,
    order_index INT NOT NULL,
    marks_override INT NULL,
    
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_quiz_question (quiz_id, question_id),
    UNIQUE KEY unique_quiz_order (quiz_id, order_index),
    INDEX idx_quiz_id (quiz_id),
    INDEX idx_question_id (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- QUIZ_ATTEMPTS TABLE
-- ============================================
CREATE TABLE quiz_attempts (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    quiz_id CHAR(36) NOT NULL,
    student_id CHAR(36) NOT NULL,
    attempt_number INT NOT NULL DEFAULT 1,
    
    -- Attempt lifecycle
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP NULL,
    status ENUM('in_progress', 'submitted', 'graded', 'auto_submitted') NOT NULL DEFAULT 'in_progress',
    
    -- Scoring
    score DECIMAL(5, 2),
    total_marks INT,
    percentage DECIMAL(5, 2),
    passed BOOLEAN,
    
    -- Anti-cheating
    total_violations INT DEFAULT 0,
    auto_submitted_due_to_violations BOOLEAN DEFAULT FALSE,
    
    -- Browser/device info
    ip_address VARCHAR(45),  -- IPv6 support
    user_agent TEXT,
    
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY unique_attempt (quiz_id, student_id, attempt_number),
    INDEX idx_quiz_id (quiz_id),
    INDEX idx_student_id (student_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STUDENT_ANSWERS TABLE
-- ============================================
CREATE TABLE student_answers (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    attempt_id CHAR(36) NOT NULL,
    question_id CHAR(36) NOT NULL,
    
    -- Answer (polymorphic based on question type)
    answer_text TEXT,
    answer_option INT,
    
    -- Grading
    marks_awarded DECIMAL(5, 2),
    feedback TEXT,
    graded_by CHAR(36),
    graded_at TIMESTAMP NULL,
    
    -- Auto-save support
    is_final BOOLEAN DEFAULT FALSE,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by) REFERENCES teachers(id) ON DELETE SET NULL,
    INDEX idx_attempt_id (attempt_id),
    INDEX idx_question_id (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- VIOLATIONS TABLE
-- ============================================
CREATE TABLE violations (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    attempt_id CHAR(36) NOT NULL,
    violation_type ENUM('tab_switch', 'fullscreen_exit', 'copy_attempt', 
                        'paste_attempt', 'right_click', 'focus_lost', 
                        'multiple_windows') NOT NULL,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    question_index INT,
    severity ENUM('low', 'medium', 'high'),
    metadata JSON,
    
    FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    INDEX idx_attempt_id (attempt_id),
    INDEX idx_violation_type (violation_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PASSWORD_RESET_TOKENS TABLE
-- ============================================
CREATE TABLE password_reset_tokens (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    token VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- REFRESH_TOKENS TABLE
-- ============================================
CREATE TABLE refresh_tokens (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- AUDIT_LOGS TABLE
-- ============================================
CREATE TABLE audit_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id CHAR(36),
    old_value JSON,
    new_value JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE notifications (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.2 Flask-SQLAlchemy Models

```python
# app/models.py
from datetime import datetime
from enum import Enum as PyEnum
from app import db
import uuid

def generate_uuid():
    return str(uuid.uuid4())

# Enums
class UserRole(PyEnum):
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"

class QuizStatus(PyEnum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"

class QuestionType(PyEnum):
    MCQ = "mcq"
    DESCRIPTIVE = "descriptive"
    TRUE_FALSE = "true_false"
    SHORT_ANSWER = "short_answer"

class Difficulty(PyEnum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class AttemptStatus(PyEnum):
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    GRADED = "graded"
    AUTO_SUBMITTED = "auto_submitted"

class ViolationType(PyEnum):
    TAB_SWITCH = "tab_switch"
    FULLSCREEN_EXIT = "fullscreen_exit"
    COPY_ATTEMPT = "copy_attempt"
    PASTE_ATTEMPT = "paste_attempt"
    RIGHT_CLICK = "right_click"
    FOCUS_LOST = "focus_lost"
    MULTIPLE_WINDOWS = "multiple_windows"

# Association Tables
teacher_classes = db.Table('teacher_classes',
    db.Column('id', db.String(36), primary_key=True, default=generate_uuid),
    db.Column('teacher_id', db.String(36), db.ForeignKey('teachers.id', ondelete='CASCADE'), nullable=False),
    db.Column('class_id', db.String(36), db.ForeignKey('classes.id', ondelete='CASCADE'), nullable=False),
    db.Column('assigned_at', db.DateTime, default=datetime.utcnow)
)

quiz_classes = db.Table('quiz_classes',
    db.Column('id', db.String(36), primary_key=True, default=generate_uuid),
    db.Column('quiz_id', db.String(36), db.ForeignKey('quizzes.id', ondelete='CASCADE'), nullable=False),
    db.Column('class_id', db.String(36), db.ForeignKey('classes.id', ondelete='CASCADE'), nullable=False),
    db.Column('assigned_at', db.DateTime, default=datetime.utcnow)
)

# Models
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum(UserRole), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    is_email_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    # Relationships
    teacher = db.relationship('Teacher', back_populates='user', uselist=False, cascade='all, delete-orphan')
    student = db.relationship('Student', back_populates='user', uselist=False, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'role': self.role.value if isinstance(self.role, PyEnum) else self.role,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Teacher(db.Model):
    __tablename__ = 'teachers'
    
    id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    subject = db.Column(db.String(100))
    phone = db.Column(db.String(20))
    department = db.Column(db.String(100))
    bio = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', back_populates='teacher')
    classes = db.relationship('Class', secondary=teacher_classes, back_populates='teachers')
    quizzes = db.relationship('Quiz', back_populates='creator', foreign_keys='Quiz.created_by')
    questions = db.relationship('Question', back_populates='creator')
    
    def to_dict(self, include_user=True):
        data = {
            'id': self.id,
            'subject': self.subject,
            'phone': self.phone,
            'department': self.department,
            'bio': self.bio
        }
        if include_user and self.user:
            data.update(self.user.to_dict())
        return data

class Student(db.Model):
    __tablename__ = 'students'
    
    id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    registration_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    class_id = db.Column(db.String(36), db.ForeignKey('classes.id', ondelete='SET NULL'))
    date_of_birth = db.Column(db.Date)
    parent_email = db.Column(db.String(255))
    parent_phone = db.Column(db.String(20))
    is_account_claimed = db.Column(db.Boolean, default=False)
    claimed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', back_populates='student')
    class_ = db.relationship('Class', back_populates='students', foreign_keys=[class_id])
    attempts = db.relationship('QuizAttempt', back_populates='student', cascade='all, delete-orphan')
    
    def to_dict(self, include_user=True):
        data = {
            'id': self.id,
            'registration_number': self.registration_number,
            'class_id': self.class_id,
            'class_name': self.class_.name if self.class_ else None,
            'is_account_claimed': self.is_account_claimed
        }
        if include_user and self.user:
            data.update(self.user.to_dict())
        return data

class Class(db.Model):
    __tablename__ = 'classes'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    name = db.Column(db.String(100), nullable=False, index=True)
    section = db.Column(db.String(50))
    academic_year = db.Column(db.String(20))
    created_by = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='SET NULL'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    students = db.relationship('Student', back_populates='class_', foreign_keys='Student.class_id')
    teachers = db.relationship('Teacher', secondary=teacher_classes, back_populates='classes')
    quizzes = db.relationship('Quiz', secondary=quiz_classes, back_populates='classes')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'section': self.section,
            'academic_year': self.academic_year,
            'student_count': len(self.students),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Quiz(db.Model):
    __tablename__ = 'quizzes'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    title = db.Column(db.String(255), nullable=False)
    subject = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    access_code = db.Column(db.String(20), unique=True, nullable=False, index=True)
    time_limit_minutes = db.Column(db.Integer, nullable=False)
    status = db.Column(db.Enum(QuizStatus), nullable=False, default=QuizStatus.DRAFT, index=True)
    start_date = db.Column(db.DateTime)
    end_date = db.Column(db.DateTime)
    created_by = db.Column(db.String(36), db.ForeignKey('teachers.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Settings
    passing_percentage = db.Column(db.Integer, default=40)
    max_attempts = db.Column(db.Integer, default=1)
    show_answers_after_submission = db.Column(db.Boolean, default=False)
    randomize_questions = db.Column(db.Boolean, default=False)
    randomize_options = db.Column(db.Boolean, default=False)
    allow_review = db.Column(db.Boolean, default=True)
    
    # Relationships
    creator = db.relationship('Teacher', back_populates='quizzes', foreign_keys=[created_by])
    classes = db.relationship('Class', secondary=quiz_classes, back_populates='quizzes')
    questions = db.relationship('QuizQuestion', back_populates='quiz', cascade='all, delete-orphan')
    attempts = db.relationship('QuizAttempt', back_populates='quiz', cascade='all, delete-orphan')
    
    def to_dict(self, include_questions=False):
        data = {
            'id': self.id,
            'title': self.title,
            'subject': self.subject,
            'description': self.description,
            'access_code': self.access_code,
            'time_limit_minutes': self.time_limit_minutes,
            'status': self.status.value if isinstance(self.status, PyEnum) else self.status,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'passing_percentage': self.passing_percentage,
            'max_attempts': self.max_attempts,
            'class_ids': [c.id for c in self.classes]
        }
        if include_questions:
            data['questions'] = [qq.to_dict() for qq in self.questions]
        return data

class Question(db.Model):
    __tablename__ = 'questions'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    text = db.Column(db.Text, nullable=False)
    type = db.Column(db.Enum(QuestionType), nullable=False, index=True)
    topic = db.Column(db.String(100), index=True)
    difficulty = db.Column(db.Enum(Difficulty), index=True)
    marks = db.Column(db.Integer, nullable=False)
    created_by = db.Column(db.String(36), db.ForeignKey('teachers.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # MCQ fields
    options = db.Column(db.JSON)
    correct_answer = db.Column(db.Integer)
    
    # Descriptive fields
    sample_answer = db.Column(db.Text)
    marking_rubric = db.Column(db.Text)
    
    # Relationships
    creator = db.relationship('Teacher', back_populates='questions')
    quizzes = db.relationship('QuizQuestion', back_populates='question')
    
    def to_dict(self):
        return {
            'id': self.id,
            'text': self.text,
            'type': self.type.value if isinstance(self.type, PyEnum) else self.type,
            'topic': self.topic,
            'difficulty': self.difficulty.value if isinstance(self.difficulty, PyEnum) else self.difficulty,
            'marks': self.marks,
            'options': self.options,
            'correct_answer': self.correct_answer,
            'created_by': self.created_by
        }

class QuizQuestion(db.Model):
    __tablename__ = 'quiz_questions'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    quiz_id = db.Column(db.String(36), db.ForeignKey('quizzes.id', ondelete='CASCADE'), nullable=False)
    question_id = db.Column(db.String(36), db.ForeignKey('questions.id', ondelete='CASCADE'), nullable=False)
    order_index = db.Column(db.Integer, nullable=False)
    marks_override = db.Column(db.Integer)
    
    # Relationships
    quiz = db.relationship('Quiz', back_populates='questions')
    question = db.relationship('Question', back_populates='quizzes')
    
    def to_dict(self):
        question_data = self.question.to_dict()
        question_data['order_index'] = self.order_index
        if self.marks_override:
            question_data['marks'] = self.marks_override
        return question_data

class QuizAttempt(db.Model):
    __tablename__ = 'quiz_attempts'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    quiz_id = db.Column(db.String(36), db.ForeignKey('quizzes.id', ondelete='CASCADE'), nullable=False)
    student_id = db.Column(db.String(36), db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    attempt_number = db.Column(db.Integer, nullable=False, default=1)
    
    # Lifecycle
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    submitted_at = db.Column(db.DateTime)
    status = db.Column(db.Enum(AttemptStatus), nullable=False, default=AttemptStatus.IN_PROGRESS)
    
    # Scoring
    score = db.Column(db.Numeric(5, 2))
    total_marks = db.Column(db.Integer)
    percentage = db.Column(db.Numeric(5, 2))
    passed = db.Column(db.Boolean)
    
    # Anti-cheating
    total_violations = db.Column(db.Integer, default=0)
    auto_submitted_due_to_violations = db.Column(db.Boolean, default=False)
    
    # Browser info
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    
    # Relationships
    quiz = db.relationship('Quiz', back_populates='attempts')
    student = db.relationship('Student', back_populates='attempts')
    answers = db.relationship('StudentAnswer', back_populates='attempt', cascade='all, delete-orphan')
    violations = db.relationship('Violation', back_populates='attempt', cascade='all, delete-orphan')
    
    def to_dict(self, include_answers=False):
        data = {
            'id': self.id,
            'quiz_id': self.quiz_id,
            'student_id': self.student_id,
            'attempt_number': self.attempt_number,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'status': self.status.value if isinstance(self.status, PyEnum) else self.status,
            'score': float(self.score) if self.score else None,
            'total_marks': self.total_marks,
            'percentage': float(self.percentage) if self.percentage else None,
            'passed': self.passed,
            'total_violations': self.total_violations
        }
        if include_answers:
            data['answers'] = [a.to_dict() for a in self.answers]
        return data

class StudentAnswer(db.Model):
    __tablename__ = 'student_answers'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    attempt_id = db.Column(db.String(36), db.ForeignKey('quiz_attempts.id', ondelete='CASCADE'), nullable=False)
    question_id = db.Column(db.String(36), db.ForeignKey('questions.id', ondelete='CASCADE'), nullable=False)
    
    # Answer
    answer_text = db.Column(db.Text)
    answer_option = db.Column(db.Integer)
    
    # Grading
    marks_awarded = db.Column(db.Numeric(5, 2))
    feedback = db.Column(db.Text)
    graded_by = db.Column(db.String(36), db.ForeignKey('teachers.id', ondelete='SET NULL'))
    graded_at = db.Column(db.DateTime)
    
    # Auto-save
    is_final = db.Column(db.Boolean, default=False)
    answered_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    attempt = db.relationship('QuizAttempt', back_populates='answers')
    
    def to_dict(self):
        return {
            'id': self.id,
            'question_id': self.question_id,
            'answer_text': self.answer_text,
            'answer_option': self.answer_option,
            'marks_awarded': float(self.marks_awarded) if self.marks_awarded else None,
            'feedback': self.feedback,
            'graded_at': self.graded_at.isoformat() if self.graded_at else None
        }

class Violation(db.Model):
    __tablename__ = 'violations'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    attempt_id = db.Column(db.String(36), db.ForeignKey('quiz_attempts.id', ondelete='CASCADE'), nullable=False)
    violation_type = db.Column(db.Enum(ViolationType), nullable=False)
    detected_at = db.Column(db.DateTime, default=datetime.utcnow)
    question_index = db.Column(db.Integer)
    severity = db.Column(db.String(20))
    metadata = db.Column(db.JSON)
    
    # Relationships
    attempt = db.relationship('QuizAttempt', back_populates='violations')
    
    def to_dict(self):
        return {
            'id': self.id,
            'violation_type': self.violation_type.value if isinstance(self.violation_type, PyEnum) else self.violation_type,
            'detected_at': self.detected_at.isoformat() if self.detected_at else None,
            'question_index': self.question_index,
            'severity': self.severity
        }
```

---

## 4. Project Structure

```
quiz-backend-flask/
│
├── app/
│   ├── __init__.py              # Flask app factory
│   ├── config.py                # Configuration classes
│   ├── models.py                # SQLAlchemy models
│   │
│   ├── routes/                  # Blueprint routes
│   │   ├── __init__.py
│   │   ├── auth.py              # /api/auth/*
│   │   ├── users.py             # /api/users/*
│   │   ├── teachers.py          # /api/teachers/*
│   │   ├── students.py          # /api/students/*
│   │   ├── classes.py           # /api/classes/*
│   │   ├── quizzes.py           # /api/quizzes/*
│   │   ├── questions.py         # /api/questions/*
│   │   ├── attempts.py          # /api/attempts/*
│   │   ├── grading.py           # /api/grading/*
│   │   ├── analytics.py         # /api/analytics/*
│   │   └── exports.py           # /api/exports/*
│   │
│   ├── schemas/                 # Marshmallow schemas
│   │   ├── __init__.py
│   │   ├── user_schema.py
│   │   ├── quiz_schema.py
│   │   ├── question_schema.py
│   │   └── attempt_schema.py
│   │
│   ├── services/                # Business logic
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── quiz_service.py
│   │   ├── grading_service.py
│   │   ├── violation_service.py
│   │   ├── export_service.py
│   │   ├── email_service.py
│   │   └── csv_import_service.py
│   │
│   ├── utils/                   # Utility functions
│   │   ├── __init__.py
│   │   ├── decorators.py        # Custom decorators (auth, roles)
│   │   ├── validators.py
│   │   ├── helpers.py
│   │   └── error_handlers.py
│   │
│   ├── middleware/              # Custom middleware
│   │   ├── __init__.py
│   │   └── audit_logger.py
│   │
│   └── socketio/                # SocketIO events
│       ├── __init__.py
│       └── quiz_monitor.py
│
├── migrations/                  # Flask-Migrate files
│   └── versions/
│
├── tests/                       # Test files
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_quizzes.py
│   └── test_students.py
│
├── scripts/                     # Utility scripts
│   ├── seed_data.py
│   └── create_admin.py
│
├── .env                         # Environment variables
├── .env.example
├── requirements.txt
├── run.py                       # Application entry point
├── wsgi.py                      # WSGI entry point
└── README.md
```

---

## 5. API Endpoints

### Base URL: `http://localhost:5000/api`

All endpoints from the FastAPI guide are the same, just replace `/api/v1` with `/api`. 

Refer to **Section 5** of `PYTHON_BACKEND_GUIDE.md` for complete endpoint documentation.

Key differences in Flask:
- Use `@app.route()` or `@blueprint.route()` instead of `@app.get()`, `@app.post()`
- Return tuples: `return jsonify(data), 200` instead of returning Pydantic models
- Use `request.get_json()` for body data
- Use `request.args` for query parameters

Example Flask route:
```python
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    # ... logic
    return jsonify({
        'access_token': token,
        'user': user_data
    }), 200
```

---

## 6. Authentication & Authorization

### 6.1 Flask App Initialization

```python
# app/__init__.py
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_mail import Mail
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache
from config import config

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
bcrypt = Bcrypt()
socketio = SocketIO(cors_allowed_origins="*")
mail = Mail()
limiter = Limiter(key_func=get_remote_address)
cache = Cache()

def create_app(config_name='development'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    CORS(app)
    socketio.init_app(app)
    mail.init_app(app)
    limiter.init_app(app)
    cache.init_app(app)
    
    # Register blueprints
    from app.routes import auth, users, students, teachers, classes, quizzes, questions, attempts, grading, analytics, exports
    
    app.register_blueprint(auth.auth_bp, url_prefix='/api/auth')
    app.register_blueprint(users.users_bp, url_prefix='/api/users')
    app.register_blueprint(students.students_bp, url_prefix='/api/students')
    app.register_blueprint(teachers.teachers_bp, url_prefix='/api/teachers')
    app.register_blueprint(classes.classes_bp, url_prefix='/api/classes')
    app.register_blueprint(quizzes.quizzes_bp, url_prefix='/api/quizzes')
    app.register_blueprint(questions.questions_bp, url_prefix='/api/questions')
    app.register_blueprint(attempts.attempts_bp, url_prefix='/api/attempts')
    app.register_blueprint(grading.grading_bp, url_prefix='/api/grading')
    app.register_blueprint(analytics.analytics_bp, url_prefix='/api/analytics')
    app.register_blueprint(exports.exports_bp, url_prefix='/api/exports')
    
    # Register error handlers
    from app.utils.error_handlers import register_error_handlers
    register_error_handlers(app)
    
    # Register SocketIO events
    from app.socketio import quiz_monitor
    quiz_monitor.register_events(socketio)
    
    return app
```

### 6.2 Configuration

```python
# app/config.py
import os
from datetime import timedelta

basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Database
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False
    
    # JWT
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-key-change-in-production'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'
    
    # Email
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() in ['true', 'on', '1']
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', 'noreply@quiz.com')
    
    # Rate Limiting
    RATELIMIT_STORAGE_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    RATELIMIT_DEFAULT = "100 per hour"
    
    # Caching
    CACHE_TYPE = "RedisCache"
    CACHE_REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/1')
    CACHE_DEFAULT_TIMEOUT = 300
    
    # File Upload
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    UPLOAD_FOLDER = os.path.join(basedir, 'uploads')

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('DEV_DATABASE_URL') or \
        'mysql+mysqldb://root:password@localhost/quiz_db'
    SQLALCHEMY_ECHO = True

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'mysql+mysqldb://root:password@localhost/quiz_test_db'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)
    WTF_CSRF_ENABLED = False

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'mysql+mysqldb://user:password@localhost/quiz_db'
    
    # Use stronger settings in production
    JWT_COOKIE_SECURE = True
    JWT_COOKIE_CSRF_PROTECT = True
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    PERMANENT_SESSION_LIFETIME = timedelta(hours=1)

config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
```

### 6.3 JWT Authentication

```python
# app/utils/decorators.py
from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
from app.models import User

def jwt_required_with_role(*allowed_roles):
    """
    Decorator to require JWT and check user role
    Usage: @jwt_required_with_role('admin', 'teacher')
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            
            current_user_id = get_jwt_identity()
            user = User.query.get(current_user_id)
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            if not user.is_active:
                return jsonify({'error': 'Account is inactive'}), 403
            
            # Check role if specified
            if allowed_roles:
                user_role = user.role.value if hasattr(user.role, 'value') else user.role
                if user_role not in allowed_roles:
                    return jsonify({
                        'error': f'Access denied. Required roles: {", ".join(allowed_roles)}'
                    }), 403
            
            # Pass user to the route function
            kwargs['current_user'] = user
            return fn(*args, **kwargs)
        
        return wrapper
    return decorator

# Convenience decorators
def admin_required(fn):
    return jwt_required_with_role('admin')(fn)

def teacher_required(fn):
    return jwt_required_with_role('admin', 'teacher')(fn)

def student_required(fn):
    return jwt_required_with_role('student')(fn)
```

### 6.4 Authentication Routes

```python
# app/routes/auth.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt
)
from datetime import datetime
from app import db, bcrypt
from app.models import User, Student, Teacher
from app.utils.decorators import jwt_required_with_role

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Login with email or registration number (for students)
    """
    data = request.get_json()
    
    if not data or not data.get('email_or_reg_no') or not data.get('password'):
        return jsonify({'error': 'Missing email/registration number or password'}), 400
    
    email_or_reg_no = data['email_or_reg_no']
    password = data['password']
    
    # Try to find user by email
    user = User.query.filter_by(email=email_or_reg_no.lower()).first()
    
    # If not found and looks like registration number, try that
    if not user and email_or_reg_no.upper().startswith('STU'):
        student = Student.query.filter_by(registration_number=email_or_reg_no.upper()).first()
        if student:
            user = User.query.get(student.id)
    
    # Verify user and password
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Incorrect email/registration number or password'}), 401
    
    # Check if student account is claimed
    if user.role.value == 'student':
        student = Student.query.get(user.id)
        if student and not student.is_account_claimed:
            return jsonify({'error': 'Account not claimed. Please claim your account first.'}), 403
    
    # Check if user is active
    if not user.is_active:
        return jsonify({'error': 'Account is inactive. Please contact administrator.'}), 403
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.session.commit()
    
    # Create tokens
    access_token = create_access_token(identity=user.id, additional_claims={'role': user.role.value})
    refresh_token = create_refresh_token(identity=user.id)
    
    # Get additional user info
    user_data = user.to_dict()
    if user.role.value == 'student' and user.student:
        user_data['registration_number'] = user.student.registration_number
    
    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'token_type': 'bearer',
        'expires_in': 3600,  # 1 hour in seconds
        'user': user_data
    }), 200

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.is_active:
        return jsonify({'error': 'Invalid user'}), 401
    
    access_token = create_access_token(identity=user.id, additional_claims={'role': user.role.value})
    
    return jsonify({
        'access_token': access_token,
        'token_type': 'bearer',
        'expires_in': 3600
    }), 200

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout (client-side token removal)"""
    # In Flask-JWT-Extended, logout is typically handled client-side
    # by removing the token. Optionally, implement token blacklisting.
    return jsonify({'message': 'Logged out successfully'}), 200

@auth_bp.route('/claim-account', methods=['POST'])
def claim_account():
    """Student claims their account"""
    data = request.get_json()
    
    if not data or not data.get('registration_number') or not data.get('password'):
        return jsonify({'error': 'Missing registration number or password'}), 400
    
    reg_no = data['registration_number'].upper()
    password = data['password']
    
    # Find student
    student = Student.query.filter_by(registration_number=reg_no).first()
    if not student:
        return jsonify({'error': 'Registration number not found'}), 404
    
    # Check if already claimed
    if student.is_account_claimed:
        return jsonify({'error': 'Account already claimed. Please login instead.'}), 400
    
    # Get user
    user = User.query.get(student.id)
    if not user:
        return jsonify({'error': 'User account not found'}), 404
    
    # Set password and mark as claimed
    user.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    student.is_account_claimed = True
    student.claimed_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({
        'message': 'Account claimed successfully',
        'user': user.to_dict()
    }), 200

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Request password reset"""
    from app.services.auth_service import AuthService
    
    data = request.get_json()
    if not data or not data.get('email'):
        return jsonify({'error': 'Email is required'}), 400
    
    result = AuthService.generate_reset_token(data['email'])
    
    if 'error' in result:
        return jsonify(result), 404
    
    return jsonify(result), 200

@auth_bp.route('/verify-reset-code', methods=['POST'])
def verify_reset_code():
    """Verify password reset code"""
    from app.services.auth_service import AuthService
    
    data = request.get_json()
    if not data or not data.get('email') or not data.get('code'):
        return jsonify({'error': 'Email and code are required'}), 400
    
    result = AuthService.verify_reset_token(data['email'], data['code'])
    
    if 'error' in result:
        return jsonify(result), 400
    
    return jsonify(result), 200

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password with code"""
    from app.services.auth_service import AuthService
    
    data = request.get_json()
    if not data or not data.get('email') or not data.get('code') or not data.get('new_password'):
        return jsonify({'error': 'Email, code, and new password are required'}), 400
    
    result = AuthService.reset_password(data['email'], data['code'], data['new_password'])
    
    if 'error' in result:
        return jsonify(result), 400
    
    return jsonify(result), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required_with_role()
def get_current_user(current_user):
    """Get current user info"""
    user_data = current_user.to_dict()
    
    if current_user.role.value == 'student' and current_user.student:
        user_data.update(current_user.student.to_dict(include_user=False))
    elif current_user.role.value == 'teacher' and current_user.teacher:
        user_data.update(current_user.teacher.to_dict(include_user=False))
    
    return jsonify(user_data), 200

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required_with_role()
def change_password(current_user):
    """Change user password"""
    data = request.get_json()
    
    if not data or not data.get('current_password') or not data.get('new_password'):
        return jsonify({'error': 'Current and new password are required'}), 400
    
    # Verify current password
    if not bcrypt.check_password_hash(current_user.password_hash, data['current_password']):
        return jsonify({'error': 'Current password is incorrect'}), 400
    
    # Update password
    current_user.password_hash = bcrypt.generate_password_hash(data['new_password']).decode('utf-8')
    db.session.commit()
    
    return jsonify({'message': 'Password changed successfully'}), 200
```

---

## 7. Security Implementation

### 7.1 Password Hashing

```python
# Password hashing is handled by Flask-Bcrypt
from app import bcrypt

# Hash password
hashed = bcrypt.generate_password_hash('password123').decode('utf-8')

# Verify password
is_valid = bcrypt.check_password_hash(hashed, 'password123')
```

### 7.2 Violation Tracking Service

```python
# app/services/violation_service.py
from datetime import datetime
from app import db
from app.models import Violation, QuizAttempt

class ViolationService:
    
    @staticmethod
    def record_violation(attempt_id, violation_type, question_index=None, severity='medium', metadata=None):
        """
        Record a violation and check if auto-submit is needed
        """
        # Create violation record
        violation = Violation(
            attempt_id=attempt_id,
            violation_type=violation_type,
            question_index=question_index,
            severity=severity,
            metadata=metadata
        )
        db.session.add(violation)
        
        # Update attempt violation count
        attempt = QuizAttempt.query.get(attempt_id)
        if not attempt:
            raise ValueError("Attempt not found")
        
        attempt.total_violations += 1
        
        # Check if auto-submit needed (3 or more violations)
        auto_submit = False
        if attempt.total_violations >= 3:
            attempt.status = 'auto_submitted'
            attempt.auto_submitted_due_to_violations = True
            attempt.submitted_at = datetime.utcnow()
            auto_submit = True
        
        db.session.commit()
        
        return {
            'violation_id': violation.id,
            'total_violations': attempt.total_violations,
            'auto_submit': auto_submit
        }
    
    @staticmethod
    def get_attempt_violations(attempt_id):
        """Get all violations for an attempt"""
        return Violation.query.filter_by(attempt_id=attempt_id).order_by(Violation.detected_at).all()
```

### 7.3 Rate Limiting

```python
# Usage in routes
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from app import limiter

# Apply to specific routes
@auth_bp.route('/login', methods=['POST'])
@limiter.limit("5 per minute")  # Max 5 login attempts per minute
def login():
    # ... login logic
    pass

# Apply globally in app factory
limiter.limit("100 per hour")(app)
```

### 7.4 CORS Configuration

```python
# CORS is handled by Flask-CORS in app/__init__.py
from flask_cors import CORS

# In create_app()
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://localhost:5173", "https://yourdomain.com"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})
```

### 7.5 Error Handlers

```python
# app/utils/error_handlers.py
from flask import jsonify
from werkzeug.exceptions import HTTPException
from sqlalchemy.exc import IntegrityError
from marshmallow import ValidationError

def register_error_handlers(app):
    
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({'error': 'Bad request', 'message': str(error)}), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({'error': 'Unauthorized', 'message': 'Authentication required'}), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({'error': 'Forbidden', 'message': 'Access denied'}), 403
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not found', 'message': str(error)}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        app.logger.error(f'Internal error: {error}')
        return jsonify({'error': 'Internal server error'}), 500
    
    @app.errorhandler(IntegrityError)
    def handle_integrity_error(error):
        return jsonify({'error': 'Database integrity error', 'message': 'Duplicate or invalid data'}), 409
    
    @app.errorhandler(ValidationError)
    def handle_validation_error(error):
        return jsonify({'error': 'Validation error', 'messages': error.messages}), 400
    
    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        return jsonify({'error': error.name, 'message': error.description}), error.code
```

---

## 8. Real-time Features

### 8.1 Flask-SocketIO Implementation

```python
# app/socketio/quiz_monitor.py
from flask_socketio import emit, join_room, leave_room
from flask_jwt_extended import decode_token
from app.services.quiz_service import QuizService
import asyncio

def register_events(socketio):
    
    @socketio.on('connect', namespace='/quiz-monitor')
    def handle_connect():
        print('Client connected to quiz monitor')
    
    @socketio.on('disconnect', namespace='/quiz-monitor')
    def handle_disconnect():
        print('Client disconnected from quiz monitor')
    
    @socketio.on('join_quiz', namespace='/quiz-monitor')
    def handle_join_quiz(data):
        """
        Client joins a quiz monitoring room
        data = { 'quiz_id': 'uuid', 'token': 'jwt_token' }
        """
        try:
            # Verify token
            token = data.get('token')
            if not token:
                emit('error', {'message': 'Unauthorized'})
                return
            
            decoded = decode_token(token)
            role = decoded.get('role')
            
            # Only teachers and admins can monitor
            if role not in ['teacher', 'admin']:
                emit('error', {'message': 'Forbidden'})
                return
            
            quiz_id = data.get('quiz_id')
            if not quiz_id:
                emit('error', {'message': 'Quiz ID required'})
                return
            
            # Join room
            join_room(f'quiz_{quiz_id}')
            emit('joined', {'quiz_id': quiz_id})
            
            # Send initial status
            status = QuizService.get_quiz_monitor_status(quiz_id)
            emit('quiz_status', status)
            
        except Exception as e:
            emit('error', {'message': str(e)})
    
    @socketio.on('leave_quiz', namespace='/quiz-monitor')
    def handle_leave_quiz(data):
        """Client leaves quiz monitoring room"""
        quiz_id = data.get('quiz_id')
        if quiz_id:
            leave_room(f'quiz_{quiz_id}')
            emit('left', {'quiz_id': quiz_id})
    
    # Background task to send periodic updates
    @socketio.on('start_monitoring', namespace='/quiz-monitor')
    def handle_start_monitoring(data):
        """Start sending periodic updates for a quiz"""
        quiz_id = data.get('quiz_id')
        
        def send_updates():
            import time
            while True:
                time.sleep(5)  # Update every 5 seconds
                status = QuizService.get_quiz_monitor_status(quiz_id)
                socketio.emit('quiz_status', status, room=f'quiz_{quiz_id}', namespace='/quiz-monitor')
        
        # Start background thread
        socketio.start_background_task(send_updates)

# Function to broadcast violation (called from violation service)
def broadcast_violation(socketio, quiz_id, violation_data):
    """Broadcast violation to all monitors of a quiz"""
    socketio.emit('violation', violation_data, room=f'quiz_{quiz_id}', namespace='/quiz-monitor')

# Function to broadcast submission
def broadcast_submission(socketio, quiz_id, submission_data):
    """Broadcast attempt submission"""
    socketio.emit('attempt_submitted', submission_data, room=f'quiz_{quiz_id}', namespace='/quiz-monitor')
```

### 8.2 Client-Side SocketIO Connection (Frontend)

```typescript
// frontend/src/lib/socket.ts
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export function connectToQuizMonitor(quizId: string, token: string) {
  socket = io(`${SOCKET_URL}/quiz-monitor`, {
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('Connected to quiz monitor');
    socket?.emit('join_quiz', { quiz_id: quizId, token });
  });

  socket.on('quiz_status', (data) => {
    console.log('Quiz status update:', data);
    // Update your UI with the status
  });

  socket.on('violation', (data) => {
    console.log('Violation detected:', data);
    // Show notification
  });

  socket.on('attempt_submitted', (data) => {
    console.log('Attempt submitted:', data);
    // Update attempts list
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  return socket;
}

export function disconnectFromQuizMonitor(quizId: string) {
  if (socket) {
    socket.emit('leave_quiz', { quiz_id: quizId });
    socket.disconnect();
    socket = null;
  }
}
```

---

## 9. File Upload & Processing

### 9.1 CSV Import Service

```python
# app/services/csv_import_service.py
import pandas as pd
from werkzeug.utils import secure_filename
from app import db, bcrypt
from app.models import Student, User, Class
import uuid

class CSVImportService:
    
    @staticmethod
    def import_students(file, created_by_id):
        """
        Import students from CSV file
        Expected columns: name, email, registration_number, class_name
        """
        try:
            # Read CSV
            df = pd.read_csv(file)
            
            # Validate columns
            required_columns = ['name', 'email', 'registration_number', 'class_name']
            if not all(col in df.columns for col in required_columns):
                return {
                    'success': False,
                    'error': f'Missing required columns. Required: {", ".join(required_columns)}'
                }
            
            imported = []
            failed = []
            
            for index, row in df.iterrows():
                try:
                    # Validate data
                    if pd.isna(row['email']) or pd.isna(row['registration_number']):
                        failed.append({
                            'row': index + 2,
                            'error': 'Missing email or registration number'
                        })
                        continue
                    
                    # Check if student already exists
                    existing_student = Student.query.filter_by(registration_number=row['registration_number']).first()
                    existing_user = User.query.filter_by(email=row['email'].lower()).first()
                    
                    if existing_student or existing_user:
                        failed.append({
                            'row': index + 2,
                            'error': 'Student with this email or registration number already exists'
                        })
                        continue
                    
                    # Find or create class
                    class_obj = Class.query.filter_by(name=row['class_name']).first()
                    
                    if not class_obj:
                        class_obj = Class(
                            id=str(uuid.uuid4()),
                            name=row['class_name'],
                            created_by=created_by_id
                        )
                        db.session.add(class_obj)
                        db.session.flush()
                    
                    # Create user
                    user = User(
                        id=str(uuid.uuid4()),
                        email=row['email'].lower(),
                        password_hash=bcrypt.generate_password_hash('').decode('utf-8'),  # Empty password
                        role='student',
                        name=row['name'],
                        is_active=True
                    )
                    db.session.add(user)
                    db.session.flush()
                    
                    # Create student
                    student = Student(
                        id=user.id,
                        registration_number=row['registration_number'],
                        class_id=class_obj.id,
                        is_account_claimed=False
                    )
                    db.session.add(student)
                    
                    imported.append({
                        'name': row['name'],
                        'email': row['email'],
                        'registration_number': row['registration_number'],
                        'class': row['class_name']
                    })
                
                except Exception as e:
                    failed.append({
                        'row': index + 2,
                        'error': str(e)
                    })
            
            db.session.commit()
            
            return {
                'success': True,
                'imported': len(imported),
                'failed': len(failed),
                'imported_students': imported,
                'errors': failed
            }
        
        except Exception as e:
            db.session.rollback()
            return {
                'success': False,
                'error': f'Failed to process CSV: {str(e)}'
            }
```

### 9.2 CSV Import Route

```python
# app/routes/students.py (add this endpoint)
from flask import request, jsonify
from werkzeug.utils import secure_filename
from app.services.csv_import_service import CSVImportService
from app.utils.decorators import admin_required

@students_bp.route('/bulk-import', methods=['POST'])
@admin_required
def bulk_import(current_user):
    """Import students from CSV file"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not file.filename.endswith('.csv'):
        return jsonify({'error': 'File must be CSV'}), 400
    
    # Process import
    result = CSVImportService.import_students(file, current_user.id)
    
    if not result['success']:
        return jsonify(result), 400
    
    return jsonify(result), 200
```

### 9.3 Export Service

```python
# app/services/export_service.py
import pandas as pd
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib import colors
from app.models import Student, User, QuizAttempt, Quiz
from app import db

class ExportService:
    
    @staticmethod
    def export_students_csv(class_id=None):
        """Export students to CSV"""
        query = db.session.query(Student, User).join(User)
        
        if class_id:
            query = query.filter(Student.class_id == class_id)
        
        students = query.all()
        
        data = []
        for student, user in students:
            data.append({
                'Name': user.name,
                'Email': user.email,
                'Registration Number': student.registration_number,
                'Class': student.class_.name if student.class_ else 'Unassigned',
                'Account Claimed': 'Yes' if student.is_account_claimed else 'No'
            })
        
        df = pd.DataFrame(data)
        
        output = BytesIO()
        df.to_csv(output, index=False)
        output.seek(0)
        return output
    
    @staticmethod
    def export_quiz_results_csv(quiz_id):
        """Export quiz results to CSV"""
        attempts = db.session.query(QuizAttempt, Student, User, Quiz).join(
            Student, QuizAttempt.student_id == Student.id
        ).join(
            User, Student.id == User.id
        ).join(
            Quiz, QuizAttempt.quiz_id == Quiz.id
        ).filter(QuizAttempt.quiz_id == quiz_id).all()
        
        data = []
        for attempt, student, user, quiz in attempts:
            data.append({
                'Student Name': user.name,
                'Registration Number': student.registration_number,
                'Quiz Title': quiz.title,
                'Attempt Number': attempt.attempt_number,
                'Score': float(attempt.score) if attempt.score else 0,
                'Total Marks': attempt.total_marks,
                'Percentage': f"{float(attempt.percentage):.2f}%" if attempt.percentage else "N/A",
                'Status': attempt.status.value if hasattr(attempt.status, 'value') else attempt.status,
                'Passed': 'Yes' if attempt.passed else 'No',
                'Violations': attempt.total_violations,
                'Submitted At': attempt.submitted_at.strftime("%Y-%m-%d %H:%M:%S") if attempt.submitted_at else "N/A"
            })
        
        df = pd.DataFrame(data)
        
        output = BytesIO()
        df.to_csv(output, index=False)
        output.seek(0)
        return output
```

### 9.4 Export Routes

```python
# app/routes/exports.py
from flask import Blueprint, send_file, request
from app.services.export_service import ExportService
from app.utils.decorators import teacher_required, admin_required
from datetime import datetime

exports_bp = Blueprint('exports', __name__)

@exports_bp.route('/students', methods=['GET'])
@admin_required
def export_students(current_user):
    """Export students to CSV"""
    class_id = request.args.get('class_id')
    
    csv_data = ExportService.export_students_csv(class_id)
    
    filename = f'students_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    
    return send_file(
        csv_data,
        mimetype='text/csv',
        as_attachment=True,
        download_name=filename
    )

@exports_bp.route('/quiz/<quiz_id>/results', methods=['GET'])
@teacher_required
def export_quiz_results(quiz_id, current_user):
    """Export quiz results to CSV"""
    csv_data = ExportService.export_quiz_results_csv(quiz_id)
    
    filename = f'quiz_results_{quiz_id}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    
    return send_file(
        csv_data,
        mimetype='text/csv',
        as_attachment=True,
        download_name=filename
    )
```

---

## 10. Implementation Steps

### Phase 1: Setup & Foundation (Week 1)

```bash
# 1. Create project structure
mkdir quiz-backend-flask
cd quiz-backend-flask
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Setup MySQL database
mysql -u root -p
> CREATE DATABASE quiz_management_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
> CREATE USER 'quiz_user'@'localhost' IDENTIFIED BY 'secure_password';
> GRANT ALL PRIVILEGES ON quiz_management_db.* TO 'quiz_user'@'localhost';
> FLUSH PRIVILEGES;
> EXIT;

# 4. Configure environment
cp .env.example .env
# Edit .env with your database credentials

# 5. Initialize database with Flask-Migrate
flask db init
flask db migrate -m "Initial migration"
flask db upgrade

# 6. Create seed data
python scripts/seed_data.py

# 7. Run the application
flask run
# Or for development with auto-reload:
python run.py
```

### Phase 2: Authentication & User Management (Week 2)

1. Implement JWT authentication
2. Create login/logout/refresh endpoints
3. Implement student claim account
4. Implement password reset flow
5. Create user CRUD endpoints
6. Add role-based decorators

### Phase 3: Core Features (Week 3-4)

1. Implement class management
2. Create quiz CRUD operations
3. Implement question bank
4. Build quiz attempt system
5. Add anti-cheating violation tracking
6. Implement auto-grading for MCQ

### Phase 4: Grading & Analytics (Week 5)

1. Create grading interface for descriptive questions
2. Implement analytics endpoints
3. Build export/print functionality
4. Add email notifications

### Phase 5: Real-time & Advanced Features (Week 6)

1. Implement Flask-SocketIO for quiz monitoring
2. Add CSV import functionality
3. Create audit logging
4. Implement caching with Redis

### Phase 6: Testing & Deployment (Week 7)

1. Write unit tests with pytest
2. Write integration tests
3. Load testing
4. API documentation (Flasgger/Swagger)
5. Deploy to production

---

## 11. Testing Strategy

### 11.1 Test Configuration

```python
# tests/conftest.py
import pytest
from app import create_app, db
from app.models import User, Teacher, Student
from app import bcrypt

@pytest.fixture(scope='session')
def app():
    """Create application for testing"""
    app = create_app('testing')
    
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

@pytest.fixture(scope='function')
def client(app):
    """Create test client"""
    return app.test_client()

@pytest.fixture(scope='function')
def db_session(app):
    """Create database session for testing"""
    with app.app_context():
        db.create_all()
        yield db
        db.session.remove()
        db.drop_all()

@pytest.fixture
def admin_user(db_session):
    """Create admin user for testing"""
    user = User(
        email='admin@test.com',
        password_hash=bcrypt.generate_password_hash('admin123').decode('utf-8'),
        role='admin',
        name='Test Admin',
        is_active=True
    )
    db_session.session.add(user)
    db_session.session.commit()
    return user

@pytest.fixture
def admin_token(client, admin_user):
    """Get admin JWT token"""
    response = client.post('/api/auth/login', json={
        'email_or_reg_no': 'admin@test.com',
        'password': 'admin123'
    })
    return response.get_json()['access_token']
```

### 11.2 Test Examples

```python
# tests/test_auth.py
def test_login_with_email(client, admin_user):
    """Test login with email"""
    response = client.post('/api/auth/login', json={
        'email_or_reg_no': 'admin@test.com',
        'password': 'admin123'
    })
    
    assert response.status_code == 200
    data = response.get_json()
    assert 'access_token' in data
    assert data['user']['role'] == 'admin'

def test_login_with_wrong_password(client, admin_user):
    """Test login with wrong password"""
    response = client.post('/api/auth/login', json={
        'email_or_reg_no': 'admin@test.com',
        'password': 'wrongpassword'
    })
    
    assert response.status_code == 401

def test_protected_route_without_token(client):
    """Test accessing protected route without token"""
    response = client.get('/api/auth/me')
    assert response.status_code == 401

def test_protected_route_with_token(client, admin_token):
    """Test accessing protected route with token"""
    response = client.get('/api/auth/me', headers={
        'Authorization': f'Bearer {admin_token}'
    })
    assert response.status_code == 200

# tests/test_students.py
def test_create_student(client, admin_token, db_session):
    """Test creating a student"""
    from app.models import Class
    
    # Create a class first
    test_class = Class(name='Test Class', section='A')
    db_session.session.add(test_class)
    db_session.session.commit()
    
    response = client.post('/api/students', 
        headers={'Authorization': f'Bearer {admin_token}'},
        json={
            'name': 'Test Student',
            'email': 'student@test.com',
            'registration_number': 'STU2024999',
            'class_id': test_class.id
        }
    )
    
    assert response.status_code == 201
    data = response.get_json()
    assert data['name'] == 'Test Student'
    assert data['registration_number'] == 'STU2024999'

# Run tests with:
# pytest
# pytest --cov=app tests/  # With coverage
# pytest -v  # Verbose
```

---

## 12. Deployment Guide

### 12.1 Environment Variables (.env)

```bash
# .env
FLASK_APP=run.py
FLASK_ENV=production
SECRET_KEY=your-super-secret-key-change-this
JWT_SECRET_KEY=your-jwt-secret-key-change-this

# Database
DATABASE_URL=mysql+mysqldb://quiz_user:secure_password@localhost/quiz_management_db

# Email
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_DEFAULT_SENDER=noreply@quiz.com

# Redis (optional)
REDIS_URL=redis://localhost:6379/0

# CORS
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 12.2 Application Entry Points

```python
# run.py (Development)
from app import create_app, socketio
import os

app = create_app(os.getenv('FLASK_ENV') or 'development')

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
```

```python
# wsgi.py (Production with Gunicorn)
from app import create_app, socketio
import os

app = create_app(os.getenv('FLASK_ENV') or 'production')

if __name__ == '__main__':
    socketio.run(app)
```

### 12.3 Gunicorn Configuration

```python
# gunicorn_config.py
import multiprocessing

bind = "0.0.0.0:5000"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "gevent"  # Required for SocketIO
threads = 2
timeout = 120
keepalive = 5

# Logging
accesslog = "logs/access.log"
errorlog = "logs/error.log"
loglevel = "info"

# Process naming
proc_name = "quiz_backend"

# Server mechanics
daemon = False
pidfile = "gunicorn.pid"
```

### 12.4 Systemd Service

```ini
# /etc/systemd/system/quiz-backend.service
[Unit]
Description=Quiz Management Backend
After=network.target mysql.service

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/var/www/quiz-backend
Environment="PATH=/var/www/quiz-backend/venv/bin"
ExecStart=/var/www/quiz-backend/venv/bin/gunicorn -c gunicorn_config.py wsgi:app
Restart=always

[Install]
WantedBy=multi-user.target
```

### 12.5 Nginx Configuration

```nginx
# /etc/nginx/sites-available/quiz-backend
server {
    listen 80;
    server_name api.yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Max upload size (for CSV imports)
    client_max_body_size 16M;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket support for SocketIO
    location /socket.io {
        proxy_pass http://localhost:5000/socket.io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Static files (if any)
    location /static {
        alias /var/www/quiz-backend/app/static;
        expires 30d;
    }
}
```

### 12.6 Docker Setup

```dockerfile
# Dockerfile
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    default-libmysqlclient-dev \
    build-essential \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 5000

# Run application
CMD ["gunicorn", "-c", "gunicorn_config.py", "wsgi:app"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: quiz_management_db
      MYSQL_USER: quiz_user
      MYSQL_PASSWORD: secure_password
      MYSQL_ROOT_PASSWORD: root_password
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    command: --default-authentication-plugin=mysql_native_password

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build: .
    ports:
      - "5000:5000"
    depends_on:
      - mysql
      - redis
    environment:
      FLASK_ENV: production
      DATABASE_URL: mysql+mysqldb://quiz_user:secure_password@mysql/quiz_management_db
      REDIS_URL: redis://redis:6379/0
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

volumes:
  mysql_data:
  redis_data:
```

### 12.7 Deployment Commands

```bash
# Development
flask run

# Production with Gunicorn
gunicorn -c gunicorn_config.py wsgi:app

# Docker Compose
docker-compose up -d

# Run migrations
flask db upgrade

# Create admin user
python scripts/create_admin.py

# View logs
docker-compose logs -f backend

# Backup MySQL database
docker-compose exec mysql mysqldump -u quiz_user -p quiz_management_db > backup.sql

# Restore database
docker-compose exec -T mysql mysql -u quiz_user -p quiz_management_db < backup.sql
```

### 12.8 Production Checklist

- [ ] Set strong SECRET_KEY and JWT_SECRET_KEY
- [ ] Use HTTPS (SSL/TLS certificates)
- [ ] Configure firewall (only allow necessary ports)
- [ ] Set up database backups
- [ ] Enable CORS only for trusted origins
- [ ] Configure rate limiting
- [ ] Set up monitoring (e.g., Sentry, New Relic)
- [ ] Configure logging
- [ ] Set DEBUG=False
- [ ] Use environment variables for secrets
- [ ] Set up Redis for caching and rate limiting
- [ ] Configure email service
- [ ] Test all endpoints
- [ ] Load testing
- [ ] Security audit

---

## 13. Frontend Integration

### Update API Client

```typescript
// frontend/src/lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('access_token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token expired, try refresh
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`
        },
      });
      
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        localStorage.setItem('access_token', data.access_token);
        
        // Retry original request
        return apiCall(endpoint, options);
      } else {
        // Refresh failed, logout
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.message || 'API request failed');
  }

  return response.json();
}

// Replace all mock data imports with API calls
export const authenticateUser = (emailOrRegNo: string, password: string) => {
  return apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email_or_reg_no: emailOrRegNo,
      password: password,
    }),
  });
};

export const getQuizzes = (filters?: { status?: string; class_id?: string }) => {
  const params = new URLSearchParams(filters as any);
  return apiCall(`/quizzes?${params}`);
};

// ... more API functions
```

---

## Summary

This Flask + MySQL backend guide provides:

1. **Complete MySQL Schema** with proper indexes and relationships
2. **Flask-SQLAlchemy Models** with all enums and relationships
3. **JWT Authentication** with Flask-JWT-Extended
4. **Role-Based Access Control** with custom decorators
5. **Flask-SocketIO** for real-time quiz monitoring
6. **CSV Import/Export** with Pandas
7. **Complete Project Structure** following Flask best practices
8. **Production Deployment** with Gunicorn, Nginx, Docker
9. **Testing Strategy** with pytest-flask
10. **Security Features**: Rate limiting, CORS, password hashing

**Key Differences from FastAPI:**
- Blueprint-based routing instead of routers
- `@app.route()` decorators instead of `@app.get()`, `@app.post()`
- `jsonify()` for responses
- Flask-JWT-Extended instead of python-jose
- Flask-SocketIO instead of WebSockets
- Synchronous by default (simpler)
- Marshmallow for validation instead of Pydantic

The Flask backend is **production-ready** and will seamlessly integrate with your React frontend! 🚀
