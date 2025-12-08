# Python Backend Development Guide for Quiz Management System

**Version:** 1.0  
**Date:** December 6, 2025  
**Framework:** FastAPI (Recommended) or Django REST Framework

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
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
- Replace mock data with real database
- Implement secure authentication (JWT)
- Handle file uploads (CSV for students)
- Real-time quiz monitoring
- Anti-cheating violation tracking
- Export/print report generation
- Role-based access control (RBAC)

---

## 2. Technology Stack

### Recommended Stack (FastAPI)

```python
# Core Framework
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-multipart==0.0.6

# Database
sqlalchemy==2.0.25
alembic==1.13.1
psycopg2-binary==2.9.9  # PostgreSQL
# OR
pymongo==4.6.1  # MongoDB alternative

# Authentication & Security
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.0
pydantic==2.5.3
pydantic-settings==2.1.0

# Real-time
python-socketio==5.11.0
websockets==12.0

# File Processing
pandas==2.1.4  # CSV processing
openpyxl==3.1.2  # Excel support
reportlab==4.0.8  # PDF generation

# Email
fastapi-mail==1.4.1

# CORS
fastapi-cors==0.0.6

# Caching (optional)
redis==5.0.1
aioredis==2.0.1

# Testing
pytest==7.4.3
pytest-asyncio==0.23.3
httpx==0.26.0
```

### Alternative Stack (Django REST Framework)

```python
Django==5.0
djangorestframework==3.14.0
djangorestframework-simplejwt==5.3.1
django-cors-headers==4.3.1
channels==4.0.0  # WebSocket support
daphne==4.0.0
celery==5.3.4  # Background tasks
```

---

## 3. Database Schema

### 3.1 PostgreSQL Schema (Recommended)

```sql
-- ============================================
-- USERS TABLE (Base table for all users)
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- TEACHERS TABLE
-- ============================================
CREATE TABLE teachers (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(100),
    phone VARCHAR(20),
    department VARCHAR(100),
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STUDENTS TABLE
-- ============================================
CREATE TABLE students (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    date_of_birth DATE,
    parent_email VARCHAR(255),
    parent_phone VARCHAR(20),
    is_account_claimed BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_students_reg_number ON students(registration_number);
CREATE INDEX idx_students_class_id ON students(class_id);

-- ============================================
-- CLASSES TABLE
-- ============================================
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    section VARCHAR(50),
    academic_year VARCHAR(20),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(name, section, academic_year)
);

CREATE INDEX idx_classes_name ON classes(name);

-- ============================================
-- TEACHER_CLASSES (Many-to-Many relationship)
-- ============================================
CREATE TABLE teacher_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(teacher_id, class_id)
);

CREATE INDEX idx_teacher_classes_teacher ON teacher_classes(teacher_id);
CREATE INDEX idx_teacher_classes_class ON teacher_classes(class_id);

-- ============================================
-- QUIZZES TABLE
-- ============================================
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    description TEXT,
    access_code VARCHAR(20) UNIQUE NOT NULL,
    time_limit_minutes INTEGER NOT NULL CHECK (time_limit_minutes > 0),
    status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_by UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Quiz settings
    passing_percentage INTEGER DEFAULT 40 CHECK (passing_percentage >= 0 AND passing_percentage <= 100),
    max_attempts INTEGER DEFAULT 1 CHECK (max_attempts > 0),
    show_answers_after_submission BOOLEAN DEFAULT FALSE,
    randomize_questions BOOLEAN DEFAULT FALSE,
    randomize_options BOOLEAN DEFAULT FALSE,
    allow_review BOOLEAN DEFAULT TRUE,
    
    CHECK (end_date IS NULL OR end_date > start_date)
);

CREATE INDEX idx_quizzes_created_by ON quizzes(created_by);
CREATE INDEX idx_quizzes_status ON quizzes(status);
CREATE INDEX idx_quizzes_access_code ON quizzes(access_code);

-- ============================================
-- QUIZ_CLASSES (Many-to-Many: Quiz assigned to classes)
-- ============================================
CREATE TABLE quiz_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(quiz_id, class_id)
);

CREATE INDEX idx_quiz_classes_quiz ON quiz_classes(quiz_id);
CREATE INDEX idx_quiz_classes_class ON quiz_classes(class_id);

-- ============================================
-- QUESTIONS TABLE (Question Bank)
-- ============================================
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text TEXT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('mcq', 'descriptive', 'true_false', 'short_answer')),
    topic VARCHAR(100),
    difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    marks INTEGER NOT NULL CHECK (marks > 0),
    created_by UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- For MCQ questions
    options JSONB,  -- Array of options: ["Option 1", "Option 2", ...]
    correct_answer INTEGER,  -- Index of correct option (0-based)
    
    -- For descriptive questions
    sample_answer TEXT,
    marking_rubric TEXT
);

CREATE INDEX idx_questions_created_by ON questions(created_by);
CREATE INDEX idx_questions_type ON questions(type);
CREATE INDEX idx_questions_topic ON questions(topic);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);

-- ============================================
-- QUIZ_QUESTIONS (Many-to-Many: Questions in a quiz)
-- ============================================
CREATE TABLE quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    marks_override INTEGER,  -- Override question marks for this specific quiz
    
    UNIQUE(quiz_id, question_id),
    UNIQUE(quiz_id, order_index)
);

CREATE INDEX idx_quiz_questions_quiz ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_questions_question ON quiz_questions(question_id);

-- ============================================
-- QUIZ_ATTEMPTS TABLE
-- ============================================
CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    
    -- Attempt lifecycle
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,
    status VARCHAR(20) NOT NULL CHECK (status IN ('in_progress', 'submitted', 'graded', 'auto_submitted')),
    
    -- Scoring
    score DECIMAL(5, 2),
    total_marks INTEGER,
    percentage DECIMAL(5, 2),
    passed BOOLEAN,
    
    -- Anti-cheating
    total_violations INTEGER DEFAULT 0,
    auto_submitted_due_to_violations BOOLEAN DEFAULT FALSE,
    
    -- Browser/device info
    ip_address INET,
    user_agent TEXT,
    
    UNIQUE(quiz_id, student_id, attempt_number)
);

CREATE INDEX idx_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX idx_attempts_student ON quiz_attempts(student_id);
CREATE INDEX idx_attempts_status ON quiz_attempts(status);

-- ============================================
-- STUDENT_ANSWERS TABLE
-- ============================================
CREATE TABLE student_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    
    -- Answer (polymorphic based on question type)
    answer_text TEXT,  -- For descriptive, short answer
    answer_option INTEGER,  -- For MCQ, true/false (0-based index)
    
    -- Grading
    marks_awarded DECIMAL(5, 2),
    feedback TEXT,
    graded_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
    graded_at TIMESTAMP,
    
    -- Auto-save support
    is_final BOOLEAN DEFAULT FALSE,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(attempt_id, question_id, is_final)
);

CREATE INDEX idx_answers_attempt ON student_answers(attempt_id);
CREATE INDEX idx_answers_question ON student_answers(question_id);

-- ============================================
-- VIOLATIONS TABLE (Anti-cheating tracking)
-- ============================================
CREATE TABLE violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    violation_type VARCHAR(50) NOT NULL CHECK (violation_type IN 
        ('tab_switch', 'fullscreen_exit', 'copy_attempt', 'paste_attempt', 
         'right_click', 'focus_lost', 'multiple_windows')),
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    question_index INTEGER,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high')),
    metadata JSONB  -- Additional context
);

CREATE INDEX idx_violations_attempt ON violations(attempt_id);
CREATE INDEX idx_violations_type ON violations(violation_type);

-- ============================================
-- PASSWORD_RESET_TOKENS TABLE
-- ============================================
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(6) NOT NULL,  -- 6-digit code
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (expires_at > created_at)
);

CREATE INDEX idx_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX idx_reset_tokens_token ON password_reset_tokens(token);

-- ============================================
-- REFRESH_TOKENS TABLE (for JWT refresh)
-- ============================================
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP,
    is_revoked BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- ============================================
-- AUDIT_LOGS TABLE (Track all important actions)
-- ============================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_answers_updated_at BEFORE UPDATE ON student_answers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3.2 SQLAlchemy Models (Python)

```python
# app/models/__init__.py
from datetime import datetime
from typing import Optional, List
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, DECIMAL, CheckConstraint, UniqueConstraint, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy.orm import relationship, declarative_base
import uuid
import enum

Base = declarative_base()

# Enums
class UserRole(str, enum.Enum):
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"

class QuizStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"

class QuestionType(str, enum.Enum):
    MCQ = "mcq"
    DESCRIPTIVE = "descriptive"
    TRUE_FALSE = "true_false"
    SHORT_ANSWER = "short_answer"

class Difficulty(str, enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class AttemptStatus(str, enum.Enum):
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    GRADED = "graded"
    AUTO_SUBMITTED = "auto_submitted"

class ViolationType(str, enum.Enum):
    TAB_SWITCH = "tab_switch"
    FULLSCREEN_EXIT = "fullscreen_exit"
    COPY_ATTEMPT = "copy_attempt"
    PASTE_ATTEMPT = "paste_attempt"
    RIGHT_CLICK = "right_click"
    FOCUS_LOST = "focus_lost"
    MULTIPLE_WINDOWS = "multiple_windows"

# Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_email_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    
    # Relationships
    teacher = relationship("Teacher", back_populates="user", uselist=False, cascade="all, delete-orphan")
    student = relationship("Student", back_populates="user", uselist=False, cascade="all, delete-orphan")

class Teacher(Base):
    __tablename__ = "teachers"
    
    id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    subject = Column(String(100))
    phone = Column(String(20))
    department = Column(String(100))
    bio = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="teacher")
    classes = relationship("TeacherClass", back_populates="teacher", cascade="all, delete-orphan")
    quizzes = relationship("Quiz", back_populates="creator", foreign_keys="Quiz.created_by")
    questions = relationship("Question", back_populates="creator")

class Student(Base):
    __tablename__ = "students"
    
    id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    registration_number = Column(String(50), unique=True, nullable=False, index=True)
    class_id = Column(UUID(as_uuid=True), ForeignKey("classes.id", ondelete="SET NULL"), nullable=True, index=True)
    date_of_birth = Column(DateTime, nullable=True)
    parent_email = Column(String(255))
    parent_phone = Column(String(20))
    is_account_claimed = Column(Boolean, default=False)
    claimed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="student")
    class_ = relationship("Class", back_populates="students", foreign_keys=[class_id])
    attempts = relationship("QuizAttempt", back_populates="student", cascade="all, delete-orphan")

class Class(Base):
    __tablename__ = "classes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, index=True)
    section = Column(String(50))
    academic_year = Column(String(20))
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint('name', 'section', 'academic_year', name='_class_unique'),
    )
    
    # Relationships
    students = relationship("Student", back_populates="class_", foreign_keys="Student.class_id")
    teachers = relationship("TeacherClass", back_populates="class_")
    quizzes = relationship("QuizClass", back_populates="class_")

class TeacherClass(Base):
    __tablename__ = "teacher_classes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False, index=True)
    class_id = Column(UUID(as_uuid=True), ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint('teacher_id', 'class_id', name='_teacher_class_unique'),
    )
    
    # Relationships
    teacher = relationship("Teacher", back_populates="classes")
    class_ = relationship("Class", back_populates="teachers")

class Quiz(Base):
    __tablename__ = "quizzes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    subject = Column(String(100), nullable=False)
    description = Column(Text)
    access_code = Column(String(20), unique=True, nullable=False, index=True)
    time_limit_minutes = Column(Integer, nullable=False)
    status = Column(SQLEnum(QuizStatus), nullable=False, index=True)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Settings
    passing_percentage = Column(Integer, default=40)
    max_attempts = Column(Integer, default=1)
    show_answers_after_submission = Column(Boolean, default=False)
    randomize_questions = Column(Boolean, default=False)
    randomize_options = Column(Boolean, default=False)
    allow_review = Column(Boolean, default=True)
    
    # Relationships
    creator = relationship("Teacher", back_populates="quizzes", foreign_keys=[created_by])
    classes = relationship("QuizClass", back_populates="quiz", cascade="all, delete-orphan")
    questions = relationship("QuizQuestion", back_populates="quiz", cascade="all, delete-orphan")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")

class QuizClass(Base):
    __tablename__ = "quiz_classes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quiz_id = Column(UUID(as_uuid=True), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    class_id = Column(UUID(as_uuid=True), ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint('quiz_id', 'class_id', name='_quiz_class_unique'),
    )
    
    # Relationships
    quiz = relationship("Quiz", back_populates="classes")
    class_ = relationship("Class", back_populates="quizzes")

class Question(Base):
    __tablename__ = "questions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    text = Column(Text, nullable=False)
    type = Column(SQLEnum(QuestionType), nullable=False, index=True)
    topic = Column(String(100), index=True)
    difficulty = Column(SQLEnum(Difficulty), index=True)
    marks = Column(Integer, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # MCQ fields
    options = Column(JSONB)  # ["Option 1", "Option 2", ...]
    correct_answer = Column(Integer)  # 0-based index
    
    # Descriptive fields
    sample_answer = Column(Text)
    marking_rubric = Column(Text)
    
    # Relationships
    creator = relationship("Teacher", back_populates="questions")
    quizzes = relationship("QuizQuestion", back_populates="question")

class QuizQuestion(Base):
    __tablename__ = "quiz_questions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quiz_id = Column(UUID(as_uuid=True), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    order_index = Column(Integer, nullable=False)
    marks_override = Column(Integer, nullable=True)
    
    __table_args__ = (
        UniqueConstraint('quiz_id', 'question_id', name='_quiz_question_unique'),
        UniqueConstraint('quiz_id', 'order_index', name='_quiz_order_unique'),
    )
    
    # Relationships
    quiz = relationship("Quiz", back_populates="questions")
    question = relationship("Question", back_populates="quizzes")

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quiz_id = Column(UUID(as_uuid=True), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    attempt_number = Column(Integer, nullable=False, default=1)
    
    # Lifecycle
    started_at = Column(DateTime, default=datetime.utcnow)
    submitted_at = Column(DateTime, nullable=True)
    status = Column(SQLEnum(AttemptStatus), nullable=False, index=True)
    
    # Scoring
    score = Column(DECIMAL(5, 2))
    total_marks = Column(Integer)
    percentage = Column(DECIMAL(5, 2))
    passed = Column(Boolean)
    
    # Anti-cheating
    total_violations = Column(Integer, default=0)
    auto_submitted_due_to_violations = Column(Boolean, default=False)
    
    # Browser info
    ip_address = Column(INET)
    user_agent = Column(Text)
    
    __table_args__ = (
        UniqueConstraint('quiz_id', 'student_id', 'attempt_number', name='_attempt_unique'),
    )
    
    # Relationships
    quiz = relationship("Quiz", back_populates="attempts")
    student = relationship("Student", back_populates="attempts")
    answers = relationship("StudentAnswer", back_populates="attempt", cascade="all, delete-orphan")
    violations = relationship("Violation", back_populates="attempt", cascade="all, delete-orphan")

class StudentAnswer(Base):
    __tablename__ = "student_answers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id = Column(UUID(as_uuid=True), ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Answer
    answer_text = Column(Text)
    answer_option = Column(Integer)
    
    # Grading
    marks_awarded = Column(DECIMAL(5, 2))
    feedback = Column(Text)
    graded_by = Column(UUID(as_uuid=True), ForeignKey("teachers.id", ondelete="SET NULL"))
    graded_at = Column(DateTime)
    
    # Auto-save
    is_final = Column(Boolean, default=False)
    answered_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    attempt = relationship("QuizAttempt", back_populates="answers")

class Violation(Base):
    __tablename__ = "violations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id = Column(UUID(as_uuid=True), ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    violation_type = Column(SQLEnum(ViolationType), nullable=False, index=True)
    detected_at = Column(DateTime, default=datetime.utcnow)
    question_index = Column(Integer)
    severity = Column(String(20))
    metadata = Column(JSONB)
    
    # Relationships
    attempt = relationship("QuizAttempt", back_populates="violations")
```

---

## 4. Project Structure

### FastAPI Project Structure

```
quiz-backend/
│
├── app/
│   ├── __init__.py
│   │
│   ├── main.py                 # FastAPI app initialization
│   ├── config.py               # Configuration settings
│   ├── database.py             # Database connection
│   │
│   ├── models/                 # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── teacher.py
│   │   ├── student.py
│   │   ├── class_.py
│   │   ├── quiz.py
│   │   ├── question.py
│   │   ├── attempt.py
│   │   └── violation.py
│   │
│   ├── schemas/                # Pydantic schemas (request/response)
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── teacher.py
│   │   ├── student.py
│   │   ├── class_.py
│   │   ├── quiz.py
│   │   ├── question.py
│   │   ├── attempt.py
│   │   └── auth.py
│   │
│   ├── api/                    # API routes
│   │   ├── __init__.py
│   │   ├── deps.py             # Dependencies (auth, db)
│   │   │
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py         # /api/v1/auth/*
│   │   │   ├── users.py        # /api/v1/users/*
│   │   │   ├── teachers.py     # /api/v1/teachers/*
│   │   │   ├── students.py     # /api/v1/students/*
│   │   │   ├── classes.py      # /api/v1/classes/*
│   │   │   ├── quizzes.py      # /api/v1/quizzes/*
│   │   │   ├── questions.py    # /api/v1/questions/*
│   │   │   ├── attempts.py     # /api/v1/attempts/*
│   │   │   ├── grading.py      # /api/v1/grading/*
│   │   │   ├── analytics.py    # /api/v1/analytics/*
│   │   │   └── exports.py      # /api/v1/exports/*
│   │   │
│   │   └── websocket/
│   │       ├── __init__.py
│   │       └── quiz_monitor.py # WebSocket for real-time monitoring
│   │
│   ├── services/               # Business logic
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── user_service.py
│   │   ├── quiz_service.py
│   │   ├── grading_service.py
│   │   ├── violation_service.py
│   │   ├── export_service.py
│   │   ├── email_service.py
│   │   └── csv_import_service.py
│   │
│   ├── utils/                  # Utility functions
│   │   ├── __init__.py
│   │   ├── security.py         # Password hashing, JWT
│   │   ├── validators.py
│   │   ├── helpers.py
│   │   └── decorators.py
│   │
│   ├── middleware/             # Custom middleware
│   │   ├── __init__.py
│   │   ├── auth_middleware.py
│   │   ├── rate_limiter.py
│   │   └── audit_logger.py
│   │
│   └── tests/                  # Test files
│       ├── __init__.py
│       ├── conftest.py
│       ├── test_auth.py
│       ├── test_quizzes.py
│       ├── test_students.py
│       └── test_grading.py
│
├── alembic/                    # Database migrations
│   ├── versions/
│   └── env.py
│
├── scripts/                    # Utility scripts
│   ├── seed_data.py
│   └── create_admin.py
│
├── .env                        # Environment variables
├── .env.example
├── requirements.txt
├── alembic.ini
├── pytest.ini
└── README.md
```

---

## 5. API Endpoints

### 5.1 Authentication Endpoints

```python
# POST /api/v1/auth/login
{
  "email_or_reg_no": "alice@student.com",  # or "STU2024001"
  "password": "student123"
}
Response: {
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "email": "alice@student.com",
    "name": "Alice Johnson",
    "role": "student",
    "registration_number": "STU2024001"  # if student
  }
}

# POST /api/v1/auth/refresh
{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
Response: {
  "access_token": "new_access_token",
  "token_type": "bearer",
  "expires_in": 3600
}

# POST /api/v1/auth/logout
Headers: { "Authorization": "Bearer <token>" }
Response: { "message": "Logged out successfully" }

# POST /api/v1/auth/claim-account
{
  "registration_number": "STU2024001",
  "password": "newpassword123",
  "confirm_password": "newpassword123"
}
Response: {
  "message": "Account claimed successfully",
  "user": { ... }
}

# POST /api/v1/auth/forgot-password
{
  "email": "alice@student.com"
}
Response: {
  "message": "Reset code sent to your email",
  "token": "123456"  # Only in development, remove in production
}

# POST /api/v1/auth/verify-reset-code
{
  "email": "alice@student.com",
  "code": "123456"
}
Response: {
  "message": "Code verified successfully",
  "reset_token": "temporary_reset_token"
}

# POST /api/v1/auth/reset-password
{
  "reset_token": "temporary_reset_token",
  "new_password": "newpass123",
  "confirm_password": "newpass123"
}
Response: {
  "message": "Password reset successfully"
}

# GET /api/v1/auth/me
Headers: { "Authorization": "Bearer <token>" }
Response: {
  "id": "uuid",
  "email": "alice@student.com",
  "name": "Alice Johnson",
  "role": "student",
  ...additional fields based on role
}
```

### 5.2 User Management (Admin Only)

```python
# GET /api/v1/users
Query params: ?role=teacher&search=john&page=1&limit=20
Response: {
  "items": [ { user objects } ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "pages": 3
}

# GET /api/v1/users/{user_id}
Response: { user object }

# POST /api/v1/users (Create user)
{
  "email": "newteacher@school.com",
  "name": "New Teacher",
  "password": "temppass123",
  "role": "teacher",
  "subject": "Mathematics"  # if teacher
}
Response: { created user object }

# PUT /api/v1/users/{user_id}
{
  "name": "Updated Name",
  "email": "newemail@school.com"
}
Response: { updated user object }

# DELETE /api/v1/users/{user_id}
Response: { "message": "User deleted successfully" }
```

### 5.3 Student Endpoints

```python
# GET /api/v1/students
Query params: ?class_id=uuid&search=alice&page=1
Response: { paginated students }

# GET /api/v1/students/{student_id}
Response: {
  "id": "uuid",
  "name": "Alice Johnson",
  "email": "alice@student.com",
  "registration_number": "STU2024001",
  "class": {
    "id": "uuid",
    "name": "Class 10A"
  },
  "is_account_claimed": true,
  "created_at": "2024-11-01T00:00:00"
}

# POST /api/v1/students (Create student - Admin/Teacher)
{
  "name": "New Student",
  "email": "newstudent@school.com",
  "registration_number": "STU2024010",
  "class_id": "uuid",
  "date_of_birth": "2008-05-15",
  "parent_email": "parent@email.com",
  "parent_phone": "+1234567890"
}
Response: { created student }

# PUT /api/v1/students/{student_id}
{
  "name": "Updated Name",
  "class_id": "new_class_uuid"
}
Response: { updated student }

# DELETE /api/v1/students/{student_id}
Response: { "message": "Student deleted" }

# POST /api/v1/students/bulk-import
Content-Type: multipart/form-data
file: CSV file
Response: {
  "message": "Import successful",
  "imported": 45,
  "failed": 2,
  "errors": [
    { "row": 3, "error": "Invalid email format" }
  ]
}

# GET /api/v1/students/export
Query params: ?class_id=uuid&format=csv
Response: CSV file download
```

### 5.4 Teacher Endpoints

```python
# GET /api/v1/teachers
Query params: ?search=john&page=1
Response: { paginated teachers }

# GET /api/v1/teachers/{teacher_id}
Response: {
  "id": "uuid",
  "name": "John Teacher",
  "email": "john@teacher.com",
  "subject": "Mathematics",
  "classes": [
    { "id": "uuid", "name": "Class 10A" }
  ]
}

# GET /api/v1/teachers/{teacher_id}/classes
Response: [ { class objects assigned to teacher } ]

# GET /api/v1/teachers/{teacher_id}/students
Response: [ { students in teacher's classes } ]
```

### 5.5 Class Management

```python
# GET /api/v1/classes
Query params: ?search=10A&page=1
Response: { paginated classes }

# GET /api/v1/classes/{class_id}
Response: {
  "id": "uuid",
  "name": "Class 10A",
  "section": "A",
  "teacher": {
    "id": "uuid",
    "name": "John Teacher"
  },
  "students": [
    { "id": "uuid", "name": "Alice", "registration_number": "STU2024001" }
  ],
  "student_count": 25,
  "created_at": "2024-01-01T00:00:00"
}

# POST /api/v1/classes (Create class - Admin)
{
  "name": "Class 11B",
  "section": "B",
  "academic_year": "2024-2025"
}
Response: { created class }

# PUT /api/v1/classes/{class_id}
{
  "name": "Updated Name"
}
Response: { updated class }

# DELETE /api/v1/classes/{class_id}
Response: { "message": "Class deleted" }

# POST /api/v1/classes/{class_id}/assign-teacher
{
  "teacher_id": "uuid"
}
Response: { "message": "Teacher assigned successfully" }

# POST /api/v1/classes/{class_id}/assign-students
{
  "student_ids": ["uuid1", "uuid2", "uuid3"]
}
Response: { "message": "Students assigned successfully" }

# DELETE /api/v1/classes/{class_id}/students/{student_id}
Response: { "message": "Student removed from class" }
```

### 5.6 Quiz Endpoints

```python
# GET /api/v1/quizzes
Query params: ?status=published&teacher_id=uuid&class_id=uuid&page=1
Response: { paginated quizzes }

# GET /api/v1/quizzes/{quiz_id}
Response: {
  "id": "uuid",
  "title": "Mathematics Quiz",
  "subject": "Mathematics",
  "description": "...",
  "access_code": "MATH001",
  "time_limit_minutes": 30,
  "status": "published",
  "start_date": "2024-12-01T00:00:00",
  "end_date": "2024-12-31T23:59:59",
  "created_by": "teacher_uuid",
  "created_at": "2024-11-15T00:00:00",
  "classes": [
    { "id": "uuid", "name": "Class 10A" }
  ],
  "questions": [
    {
      "id": "uuid",
      "text": "What is 2+2?",
      "type": "mcq",
      "options": ["3", "4", "5", "6"],
      "marks": 2,
      "order_index": 0
    }
  ],
  "total_marks": 20,
  "question_count": 10,
  "passing_percentage": 40
}

# POST /api/v1/quizzes (Create quiz - Teacher)
{
  "title": "New Quiz",
  "subject": "Science",
  "description": "Biology basics",
  "time_limit_minutes": 45,
  "start_date": "2024-12-10T10:00:00",
  "end_date": "2024-12-20T18:00:00",
  "class_ids": ["uuid1", "uuid2"],
  "question_ids": ["q_uuid1", "q_uuid2"],
  "passing_percentage": 50,
  "max_attempts": 2,
  "randomize_questions": false
}
Response: { created quiz with access_code }

# PUT /api/v1/quizzes/{quiz_id}
{
  "title": "Updated Title",
  "status": "published"
}
Response: { updated quiz }

# DELETE /api/v1/quizzes/{quiz_id}
Response: { "message": "Quiz deleted" }

# POST /api/v1/quizzes/{quiz_id}/publish
Response: { "message": "Quiz published", "access_code": "MATH001" }

# POST /api/v1/quizzes/{quiz_id}/archive
Response: { "message": "Quiz archived" }

# GET /api/v1/quizzes/access/{access_code}
# Verify access code and return quiz details (for students)
Response: { quiz details without correct answers }

# POST /api/v1/quizzes/{quiz_id}/start
# Student starts quiz attempt
Response: {
  "attempt_id": "uuid",
  "quiz": { ... },
  "time_remaining_seconds": 1800,
  "questions": [ { ... without correct answers } ]
}
```

### 5.7 Question Bank

```python
# GET /api/v1/questions
Query params: ?type=mcq&topic=Math&difficulty=easy&page=1
Response: { paginated questions }

# GET /api/v1/questions/{question_id}
Response: { question object }

# POST /api/v1/questions (Create question - Teacher)
{
  "text": "What is the capital of France?",
  "type": "mcq",
  "topic": "Geography",
  "difficulty": "easy",
  "marks": 2,
  "options": ["London", "Berlin", "Paris", "Madrid"],
  "correct_answer": 2
}
Response: { created question }

# PUT /api/v1/questions/{question_id}
{
  "text": "Updated question text",
  "marks": 3
}
Response: { updated question }

# DELETE /api/v1/questions/{question_id}
Response: { "message": "Question deleted" }

# POST /api/v1/questions/bulk-import
Content-Type: multipart/form-data
file: CSV file
Response: { import results }
```

### 5.8 Quiz Attempts (Student)

```python
# GET /api/v1/attempts
# Get student's attempts
Query params: ?quiz_id=uuid&status=graded
Response: {
  "items": [
    {
      "id": "uuid",
      "quiz": {
        "id": "uuid",
        "title": "Math Quiz",
        "subject": "Mathematics"
      },
      "attempt_number": 1,
      "status": "graded",
      "score": 18,
      "total_marks": 20,
      "percentage": 90,
      "passed": true,
      "total_violations": 0,
      "started_at": "2024-12-05T10:00:00",
      "submitted_at": "2024-12-05T10:28:30"
    }
  ]
}

# GET /api/v1/attempts/{attempt_id}
Response: {
  "id": "uuid",
  "quiz": { ... },
  "student": { ... },
  "answers": [
    {
      "question": {
        "id": "uuid",
        "text": "What is 2+2?",
        "type": "mcq",
        "options": ["3", "4", "5", "6"],
        "marks": 2
      },
      "answer_option": 1,  # student selected index 1 (which is "4")
      "correct_answer": 1,
      "marks_awarded": 2,
      "is_correct": true
    },
    {
      "question": {
        "id": "uuid2",
        "text": "Explain photosynthesis",
        "type": "descriptive",
        "marks": 5
      },
      "answer_text": "Student's descriptive answer...",
      "marks_awarded": 4,
      "feedback": "Good answer but missing some details"
    }
  ],
  "violations": [
    {
      "type": "tab_switch",
      "detected_at": "2024-12-05T10:15:30",
      "question_index": 5
    }
  ],
  "score": 18,
  "total_marks": 20,
  "percentage": 90
}

# POST /api/v1/attempts/{attempt_id}/answer
# Save/update answer during quiz
{
  "question_id": "uuid",
  "answer_option": 2,  # for MCQ
  # OR
  "answer_text": "descriptive answer..."  # for descriptive
}
Response: { "message": "Answer saved" }

# POST /api/v1/attempts/{attempt_id}/submit
Response: {
  "message": "Quiz submitted successfully",
  "score": 18,  # Only for MCQ auto-graded
  "status": "graded" or "pending"  # pending if has descriptive questions
}

# POST /api/v1/attempts/{attempt_id}/violations
# Report violation during quiz
{
  "violation_type": "tab_switch",
  "question_index": 3,
  "metadata": { ... }
}
Response: {
  "message": "Violation recorded",
  "total_violations": 2,
  "auto_submit": false  # true if >= 3 violations
}
```

### 5.9 Grading (Teacher)

```python
# GET /api/v1/grading/pending
# Get attempts waiting for grading
Query params: ?quiz_id=uuid&class_id=uuid&page=1
Response: {
  "items": [
    {
      "attempt_id": "uuid",
      "student": {
        "id": "uuid",
        "name": "Alice Johnson",
        "registration_number": "STU2024001"
      },
      "quiz": {
        "id": "uuid",
        "title": "Science Quiz"
      },
      "submitted_at": "2024-12-05T11:30:00",
      "descriptive_questions_count": 3,
      "auto_graded_score": 10,  # MCQ score
      "pending_marks": 15  # descriptive marks
    }
  ]
}

# GET /api/v1/grading/attempts/{attempt_id}
# Get attempt details for grading
Response: {
  "attempt": { ... },
  "student": { ... },
  "quiz": { ... },
  "answers": [
    {
      "answer_id": "uuid",
      "question": {
        "id": "uuid",
        "text": "Explain photosynthesis",
        "type": "descriptive",
        "marks": 5,
        "sample_answer": "...",
        "marking_rubric": "..."
      },
      "student_answer": "Student's answer text...",
      "current_marks": null,
      "current_feedback": null
    }
  ]
}

# POST /api/v1/grading/attempts/{attempt_id}/grade
{
  "grades": [
    {
      "answer_id": "uuid",
      "marks_awarded": 4,
      "feedback": "Good answer but missing details"
    },
    {
      "answer_id": "uuid2",
      "marks_awarded": 5,
      "feedback": "Excellent!"
    }
  ]
}
Response: {
  "message": "Grading completed",
  "final_score": 19,
  "total_marks": 20,
  "percentage": 95,
  "passed": true
}

# GET /api/v1/grading/graded
# Get graded attempts
Query params: ?quiz_id=uuid&page=1
Response: { paginated graded attempts }
```

### 5.10 Analytics

```python
# GET /api/v1/analytics/admin
# System-wide analytics (Admin only)
Response: {
  "total_users": {
    "admins": 2,
    "teachers": 25,
    "students": 450
  },
  "total_quizzes": 120,
  "total_attempts": 3500,
  "active_quizzes": 15,
  "recent_activity": [ ... ],
  "top_students": [ ... ],
  "teacher_stats": [ ... ]
}

# GET /api/v1/analytics/teacher/{teacher_id}
# Teacher dashboard analytics
Response: {
  "my_quizzes": 15,
  "my_classes": 3,
  "my_students": 75,
  "pending_grading": 12,
  "recent_attempts": [ ... ],
  "quiz_performance": [ ... ]
}

# GET /api/v1/analytics/student/{student_id}
# Student dashboard analytics
Response: {
  "total_attempts": 25,
  "average_score": 82,
  "quizzes_passed": 22,
  "quizzes_failed": 3,
  "recent_results": [ ... ],
  "performance_by_subject": [ ... ]
}

# GET /api/v1/analytics/quiz/{quiz_id}
# Quiz-specific analytics (Teacher)
Response: {
  "quiz": { ... },
  "total_attempts": 50,
  "average_score": 75,
  "pass_rate": 80,
  "question_statistics": [
    {
      "question": { ... },
      "correct_count": 40,
      "incorrect_count": 10,
      "success_rate": 80,
      "average_marks": 1.8
    }
  ],
  "student_performance": [ ... ],
  "violation_summary": {
    "total_violations": 25,
    "by_type": {
      "tab_switch": 15,
      "fullscreen_exit": 10
    }
  }
}

# GET /api/v1/analytics/quiz/{quiz_id}/export
# Export analytics as CSV/PDF
Query params: ?format=csv
Response: File download
```

### 5.11 Real-time Monitoring (WebSocket)

```python
# WebSocket connection
ws://api.example.com/ws/quiz-monitor/{quiz_id}

# Authentication via query param or initial message
ws://api.example.com/ws/quiz-monitor/{quiz_id}?token=jwt_token

# Server sends updates every 5 seconds
{
  "type": "quiz_status",
  "data": {
    "active_attempts": 15,
    "completed_attempts": 30,
    "students": [
      {
        "id": "uuid",
        "name": "Alice Johnson",
        "current_question": 5,
        "total_questions": 10,
        "progress": 50,
        "violations": 0,
        "time_elapsed_minutes": 12,
        "status": "in_progress"
      }
    ]
  }
}

# Violation event
{
  "type": "violation",
  "data": {
    "student_id": "uuid",
    "student_name": "Alice Johnson",
    "violation_type": "tab_switch",
    "total_violations": 2,
    "timestamp": "2024-12-05T10:15:30"
  }
}

# Attempt submitted event
{
  "type": "attempt_submitted",
  "data": {
    "student_id": "uuid",
    "student_name": "Alice Johnson",
    "submitted_at": "2024-12-05T10:30:00",
    "score": 18,  # if auto-graded
    "status": "graded" or "pending"
  }
}
```

### 5.12 Export/Print

```python
# GET /api/v1/exports/students
Query params: ?class_id=uuid&format=csv
Response: CSV file download

# GET /api/v1/exports/quiz/{quiz_id}/results
Query params: ?format=csv
Response: CSV file with all attempts

# GET /api/v1/exports/attempts/{attempt_id}/pdf
Response: PDF report of student's attempt

# GET /api/v1/exports/analytics/{quiz_id}
Query params: ?format=pdf
Response: PDF analytics report
```

---

## 6. Authentication & Authorization

### 6.1 JWT Implementation

```python
# app/utils/security.py
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Configuration
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 1 hour
REFRESH_TOKEN_EXPIRE_DAYS = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against hash"""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> dict:
    """Decode and verify JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user"""
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Inactive user")
    
    return user

# Role-based dependencies
def require_role(allowed_roles: list[str]):
    """Decorator factory for role-based access control"""
    async def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker

# Usage examples
require_admin = require_role(["admin"])
require_teacher = require_role(["teacher", "admin"])
require_student = require_role(["student"])
require_teacher_or_student = require_role(["teacher", "student"])
```

### 6.2 Login Implementation

```python
# app/api/v1/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import LoginRequest, LoginResponse
from app.models import User, Teacher, Student
from app.utils.security import verify_password, create_access_token, create_refresh_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=LoginResponse)
async def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login with email or registration number (for students)
    """
    # Try to find user by email
    user = db.query(User).filter(User.email == credentials.email_or_reg_no.lower()).first()
    
    # If not found and looks like registration number, try that
    if not user and credentials.email_or_reg_no.upper().startswith("STU"):
        student = db.query(Student).filter(
            Student.registration_number == credentials.email_or_reg_no.upper()
        ).first()
        if student:
            user = db.query(User).filter(User.id == student.id).first()
    
    # Verify user and password
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/registration number or password"
        )
    
    # Check if student account is claimed
    if user.role == "student":
        student = db.query(Student).filter(Student.id == user.id).first()
        if not student.is_account_claimed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account not claimed. Please claim your account first."
            )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact administrator."
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Create tokens
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    # Get additional user info based on role
    user_data = {
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "role": user.role
    }
    
    if user.role == "student":
        student = db.query(Student).filter(Student.id == user.id).first()
        user_data["registration_number"] = student.registration_number
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": user_data
    }
```

---

## 7. Security Implementation

### 7.1 Anti-Cheating System

```python
# app/services/violation_service.py
from typing import List
from sqlalchemy.orm import Session
from app.models import Violation, QuizAttempt
from app.schemas.violation import ViolationCreate

class ViolationService:
    
    @staticmethod
    def record_violation(
        db: Session,
        attempt_id: str,
        violation_data: ViolationCreate
    ) -> dict:
        """
        Record a violation and check if auto-submit is needed
        """
        # Create violation record
        violation = Violation(
            attempt_id=attempt_id,
            violation_type=violation_data.violation_type,
            question_index=violation_data.question_index,
            severity=violation_data.severity or "medium",
            metadata=violation_data.metadata
        )
        db.add(violation)
        
        # Update attempt violation count
        attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id).first()
        if not attempt:
            raise ValueError("Attempt not found")
        
        attempt.total_violations += 1
        
        # Check if auto-submit needed (3 or more violations)
        auto_submit = False
        if attempt.total_violations >= 3:
            attempt.status = "auto_submitted"
            attempt.auto_submitted_due_to_violations = True
            attempt.submitted_at = datetime.utcnow()
            auto_submit = True
        
        db.commit()
        
        return {
            "violation_id": str(violation.id),
            "total_violations": attempt.total_violations,
            "auto_submit": auto_submit
        }
    
    @staticmethod
    def get_attempt_violations(
        db: Session,
        attempt_id: str
    ) -> List[Violation]:
        """Get all violations for an attempt"""
        return db.query(Violation).filter(
            Violation.attempt_id == attempt_id
        ).order_by(Violation.detected_at).all()
```

### 7.2 Rate Limiting

```python
# app/middleware/rate_limiter.py
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
from datetime import datetime, timedelta
import asyncio

class RateLimiter(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute=60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests = defaultdict(list)
        self.cleanup_interval = 60  # seconds
        
        # Start cleanup task
        asyncio.create_task(self.cleanup_old_requests())
    
    async def dispatch(self, request: Request, call_next):
        # Get client identifier (IP or user ID if authenticated)
        client_id = request.client.host
        
        # Exempt certain paths
        if request.url.path.startswith("/docs") or request.url.path.startswith("/health"):
            return await call_next(request)
        
        # Check rate limit
        now = datetime.utcnow()
        minute_ago = now - timedelta(minutes=1)
        
        # Remove old requests
        self.requests[client_id] = [
            req_time for req_time in self.requests[client_id]
            if req_time > minute_ago
        ]
        
        # Check limit
        if len(self.requests[client_id]) >= self.requests_per_minute:
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later."
            )
        
        # Add current request
        self.requests[client_id].append(now)
        
        response = await call_next(request)
        return response
    
    async def cleanup_old_requests(self):
        """Periodically clean up old request records"""
        while True:
            await asyncio.sleep(self.cleanup_interval)
            now = datetime.utcnow()
            minute_ago = now - timedelta(minutes=1)
            
            for client_id in list(self.requests.keys()):
                self.requests[client_id] = [
                    req_time for req_time in self.requests[client_id]
                    if req_time > minute_ago
                ]
                if not self.requests[client_id]:
                    del self.requests[client_id]
```

### 7.3 CORS Configuration

```python
# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Quiz Management API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React dev server
        "http://localhost:5173",  # Vite dev server
        "https://yourdomain.com",  # Production frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 8. Real-time Features

### 8.1 WebSocket Implementation

```python
# app/api/websocket/quiz_monitor.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import Dict, Set
from app.utils.security import decode_token
from app.services.quiz_service import QuizService
import json
import asyncio

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # quiz_id -> Set of WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, quiz_id: str):
        await websocket.accept()
        if quiz_id not in self.active_connections:
            self.active_connections[quiz_id] = set()
        self.active_connections[quiz_id].add(websocket)
    
    def disconnect(self, websocket: WebSocket, quiz_id: str):
        if quiz_id in self.active_connections:
            self.active_connections[quiz_id].discard(websocket)
            if not self.active_connections[quiz_id]:
                del self.active_connections[quiz_id]
    
    async def broadcast_to_quiz(self, quiz_id: str, message: dict):
        if quiz_id in self.active_connections:
            for connection in self.active_connections[quiz_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass  # Connection closed

manager = ConnectionManager()

@router.websocket("/ws/quiz-monitor/{quiz_id}")
async def quiz_monitor_websocket(
    websocket: WebSocket,
    quiz_id: str,
    token: str = None
):
    # Verify token
    if not token:
        await websocket.close(code=1008, reason="Unauthorized")
        return
    
    try:
        payload = decode_token(token)
        user_role = payload.get("role")
        
        # Only teachers and admins can monitor
        if user_role not in ["teacher", "admin"]:
            await websocket.close(code=1008, reason="Forbidden")
            return
    except:
        await websocket.close(code=1008, reason="Invalid token")
        return
    
    await manager.connect(websocket, quiz_id)
    
    try:
        while True:
            # Send quiz status every 5 seconds
            await asyncio.sleep(5)
            
            # Get current quiz status
            status = await QuizService.get_quiz_monitor_status(quiz_id)
            
            await websocket.send_json({
                "type": "quiz_status",
                "data": status
            })
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, quiz_id)

# Function to broadcast violation from violation service
async def broadcast_violation(quiz_id: str, violation_data: dict):
    await manager.broadcast_to_quiz(quiz_id, {
        "type": "violation",
        "data": violation_data
    })

# Function to broadcast attempt submission
async def broadcast_submission(quiz_id: str, submission_data: dict):
    await manager.broadcast_to_quiz(quiz_id, {
        "type": "attempt_submitted",
        "data": submission_data
    })
```

---

## 9. File Upload & Processing

### 9.1 CSV Import Service

```python
# app/services/csv_import_service.py
import pandas as pd
from typing import List, Dict
from fastapi import UploadFile
from sqlalchemy.orm import Session
from app.models import Student, User, Class
from app.utils.security import hash_password
import uuid

class CSVImportService:
    
    @staticmethod
    async def import_students(
        db: Session,
        file: UploadFile,
        created_by_id: str
    ) -> Dict:
        """
        Import students from CSV file
        Expected columns: name, email, registration_number, class_name
        """
        try:
            # Read CSV
            contents = await file.read()
            df = pd.read_csv(pd.io.common.BytesIO(contents))
            
            # Validate columns
            required_columns = ['name', 'email', 'registration_number', 'class_name']
            if not all(col in df.columns for col in required_columns):
                return {
                    "success": False,
                    "error": f"Missing required columns. Required: {', '.join(required_columns)}"
                }
            
            imported = []
            failed = []
            
            for index, row in df.iterrows():
                try:
                    # Validate data
                    if pd.isna(row['email']) or pd.isna(row['registration_number']):
                        failed.append({
                            "row": index + 2,  # +2 for header and 0-indexing
                            "error": "Missing email or registration number"
                        })
                        continue
                    
                    # Check if student already exists
                    existing = db.query(Student).filter(
                        (Student.registration_number == row['registration_number']) |
                        (User.email == row['email'].lower())
                    ).first()
                    
                    if existing:
                        failed.append({
                            "row": index + 2,
                            "error": "Student with this email or registration number already exists"
                        })
                        continue
                    
                    # Find or create class
                    class_obj = db.query(Class).filter(
                        Class.name == row['class_name']
                    ).first()
                    
                    if not class_obj:
                        class_obj = Class(
                            id=uuid.uuid4(),
                            name=row['class_name'],
                            created_by=created_by_id
                        )
                        db.add(class_obj)
                        db.flush()
                    
                    # Create user
                    user = User(
                        id=uuid.uuid4(),
                        email=row['email'].lower(),
                        password_hash=hash_password(""),  # Empty password, needs to be claimed
                        role="student",
                        name=row['name'],
                        is_active=True
                    )
                    db.add(user)
                    db.flush()
                    
                    # Create student
                    student = Student(
                        id=user.id,
                        registration_number=row['registration_number'],
                        class_id=class_obj.id,
                        is_account_claimed=False
                    )
                    db.add(student)
                    
                    imported.append({
                        "name": row['name'],
                        "email": row['email'],
                        "registration_number": row['registration_number'],
                        "class": row['class_name']
                    })
                
                except Exception as e:
                    failed.append({
                        "row": index + 2,
                        "error": str(e)
                    })
            
            db.commit()
            
            return {
                "success": True,
                "imported": len(imported),
                "failed": len(failed),
                "imported_students": imported,
                "errors": failed
            }
        
        except Exception as e:
            db.rollback()
            return {
                "success": False,
                "error": f"Failed to process CSV: {str(e)}"
            }
```

### 9.2 Export Service

```python
# app/services/export_service.py
import pandas as pd
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from sqlalchemy.orm import Session
from app.models import QuizAttempt, Student, Quiz

class ExportService:
    
    @staticmethod
    def export_students_csv(db: Session, class_id: str = None) -> BytesIO:
        """Export students to CSV"""
        query = db.query(Student, User).join(User)
        
        if class_id:
            query = query.filter(Student.class_id == class_id)
        
        students = query.all()
        
        data = []
        for student, user in students:
            data.append({
                "Name": user.name,
                "Email": user.email,
                "Registration Number": student.registration_number,
                "Class": student.class_.name if student.class_ else "Unassigned",
                "Account Claimed": "Yes" if student.is_account_claimed else "No"
            })
        
        df = pd.DataFrame(data)
        
        output = BytesIO()
        df.to_csv(output, index=False)
        output.seek(0)
        return output
    
    @staticmethod
    def export_quiz_results_csv(db: Session, quiz_id: str) -> BytesIO:
        """Export quiz results to CSV"""
        attempts = db.query(QuizAttempt, Student, User, Quiz).join(
            Student, QuizAttempt.student_id == Student.id
        ).join(
            User, Student.id == User.id
        ).join(
            Quiz, QuizAttempt.quiz_id == Quiz.id
        ).filter(QuizAttempt.quiz_id == quiz_id).all()
        
        data = []
        for attempt, student, user, quiz in attempts:
            data.append({
                "Student Name": user.name,
                "Registration Number": student.registration_number,
                "Quiz Title": quiz.title,
                "Attempt Number": attempt.attempt_number,
                "Score": attempt.score or 0,
                "Total Marks": attempt.total_marks,
                "Percentage": f"{attempt.percentage:.2f}%" if attempt.percentage else "N/A",
                "Status": attempt.status,
                "Passed": "Yes" if attempt.passed else "No",
                "Violations": attempt.total_violations,
                "Submitted At": attempt.submitted_at.strftime("%Y-%m-%d %H:%M:%S") if attempt.submitted_at else "N/A"
            })
        
        df = pd.DataFrame(data)
        
        output = BytesIO()
        df.to_csv(output, index=False)
        output.seek(0)
        return output
```

---

## 10. Implementation Steps

### Phase 1: Setup & Foundation (Week 1)

```bash
# 1. Create project structure
mkdir quiz-backend
cd quiz-backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 2. Install dependencies
pip install fastapi uvicorn sqlalchemy alembic psycopg2-binary python-jose passlib python-multipart

# 3. Create basic structure
mkdir -p app/{api/v1,models,schemas,services,utils,middleware}
touch app/__init__.py app/main.py app/config.py app/database.py

# 4. Initialize database with Alembic
alembic init alembic
# Edit alembic.ini and alembic/env.py to connect to your database

# 5. Create database migrations
alembic revision --autogenerate -m "Initial schema"
alembic upgrade head

# 6. Create seed data script
python scripts/seed_data.py
```

### Phase 2: Authentication & User Management (Week 2)

1. Implement JWT authentication
2. Create login/logout endpoints
3. Implement student claim account
4. Implement password reset
5. Create user CRUD endpoints
6. Add role-based access control

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

1. Implement WebSocket for quiz monitoring
2. Add CSV import functionality
3. Create audit logging
4. Implement caching with Redis

### Phase 6: Testing & Deployment (Week 7)

1. Write unit tests
2. Write integration tests
3. Load testing
4. Documentation
5. Deploy to production

---

## 11. Testing Strategy

```python
# tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db
from app.models import User, Teacher, Student
from app.utils.security import hash_password

# Test database
SQLALCHEMY_TEST_DATABASE_URL = "postgresql://test:test@localhost/quiz_test"
engine = create_engine(SQLALCHEMY_TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)

@pytest.fixture
def admin_user(db):
    user = User(
        email="admin@test.com",
        password_hash=hash_password("admin123"),
        role="admin",
        name="Test Admin",
        is_active=True
    )
    db.add(user)
    db.commit()
    return user

@pytest.fixture
def admin_token(client, admin_user):
    response = client.post("/api/v1/auth/login", json={
        "email_or_reg_no": "admin@test.com",
        "password": "admin123"
    })
    return response.json()["access_token"]

# tests/test_auth.py
def test_login_with_email(client, admin_user):
    response = client.post("/api/v1/auth/login", json={
        "email_or_reg_no": "admin@test.com",
        "password": "admin123"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["user"]["role"] == "admin"

def test_login_with_wrong_password(client, admin_user):
    response = client.post("/api/v1/auth/login", json={
        "email_or_reg_no": "admin@test.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401

# tests/test_quizzes.py
def test_create_quiz(client, teacher_token, db):
    response = client.post(
        "/api/v1/quizzes",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "title": "Test Quiz",
            "subject": "Math",
            "description": "Test description",
            "time_limit_minutes": 30,
            "class_ids": [],
            "question_ids": []
        }
    )
    assert response.status_code == 201
    assert response.json()["title"] == "Test Quiz"

def test_unauthorized_quiz_access(client, student_token):
    response = client.get(
        "/api/v1/quizzes",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    # Students should only see their class quizzes
    assert response.status_code == 200
```

---

## 12. Deployment Guide

### 12.1 Environment Variables

```bash
# .env
DATABASE_URL=postgresql://user:password@localhost:5432/quiz_db
SECRET_KEY=your-super-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

# CORS
CORS_ORIGINS=["http://localhost:3000","https://yourdomain.com"]

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Redis (optional for caching)
REDIS_URL=redis://localhost:6379/0

# Environment
ENVIRONMENT=production
DEBUG=false
```

### 12.2 Docker Setup

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Run migrations and start server
CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: quiz_user
      POSTGRES_PASSWORD: quiz_password
      POSTGRES_DB: quiz_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: .
    ports:
      - "8000:8000"
    depends_on:
      - db
      - redis
    environment:
      DATABASE_URL: postgresql://quiz_user:quiz_password@db:5432/quiz_db
      REDIS_URL: redis://redis:6379/0
    volumes:
      - ./app:/app/app

volumes:
  postgres_data:
```

### 12.3 Production Deployment Commands

```bash
# Build and run with Docker Compose
docker-compose up -d

# Run migrations
docker-compose exec backend alembic upgrade head

# Create admin user
docker-compose exec backend python scripts/create_admin.py

# View logs
docker-compose logs -f backend

# Backup database
docker-compose exec db pg_dump -U quiz_user quiz_db > backup.sql
```

---

## 13. Frontend Integration Guide

### Update Frontend API Calls

```typescript
// frontend/src/lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('access_token');
  
  const headers = {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
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
    throw new Error(error.detail || 'API request failed');
  }

  return response.json();
}

// Replace mock data imports with API calls
export const authenticateUser = async (emailOrRegNo: string, password: string) => {
  return apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email_or_reg_no: emailOrRegNo,
      password: password,
    }),
  });
};

export const getQuizzes = async (filters?: { status?: string; class_id?: string }) => {
  const params = new URLSearchParams(filters);
  return apiCall(`/quizzes?${params}`);
};

// etc...
```

---

## Summary

This guide provides a complete roadmap for building a Python backend for your Quiz Management System. Key points:

1. **Database Schema**: Comprehensive PostgreSQL schema with all relationships
2. **API Design**: RESTful API with 50+ endpoints covering all features
3. **Authentication**: JWT-based auth with refresh tokens and role-based access
4. **Security**: Anti-cheating, rate limiting, CORS, audit logging
5. **Real-time**: WebSocket for quiz monitoring
6. **File Processing**: CSV import/export, PDF generation
7. **Testing**: Complete test strategy with pytest
8. **Deployment**: Docker-based deployment with PostgreSQL and Redis

The backend will seamlessly replace your current mock data system while maintaining the same functionality the frontend expects!
