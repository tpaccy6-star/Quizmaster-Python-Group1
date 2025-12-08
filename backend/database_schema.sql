-- ============================================
-- QUIZMASTER DATABASE SCHEMA
-- ============================================
-- Created: December 6, 2025
-- Version: 2.0 with Notifications & Attempt Reset
-- ============================================
-- DATABASE CREATION
-- ============================================
CREATE DATABASE IF NOT EXISTS quiz_management_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
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
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
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
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
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
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE
    SET NULL,
        UNIQUE KEY unique_class (name, section, academic_year),
        INDEX idx_name (name)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
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
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE
    SET NULL,
        INDEX idx_reg_number (registration_number),
        INDEX idx_class_id (class_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
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
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
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
    passing_percentage INT DEFAULT 40 CHECK (
        passing_percentage >= 0
        AND passing_percentage <= 100
    ),
    max_attempts INT DEFAULT 1 CHECK (max_attempts > 0),
    show_answers_after_submission BOOLEAN DEFAULT FALSE,
    randomize_questions BOOLEAN DEFAULT FALSE,
    randomize_options BOOLEAN DEFAULT FALSE,
    allow_review BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (created_by) REFERENCES teachers(id) ON DELETE CASCADE,
    INDEX idx_created_by (created_by),
    INDEX idx_status (status),
    INDEX idx_access_code (access_code)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
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
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- ============================================
-- QUESTIONS TABLE (Question Bank)
-- ============================================
CREATE TABLE questions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    text TEXT NOT NULL,
    type ENUM(
        'mcq',
        'descriptive',
        'true_false',
        'short_answer'
    ) NOT NULL,
    topic VARCHAR(100),
    difficulty ENUM('easy', 'medium', 'hard'),
    marks INT NOT NULL CHECK (marks > 0),
    created_by CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- For MCQ questions (stored as JSON)
    options JSON,
    -- ["Option 1", "Option tractor", ...]
    -- Index of correct. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 
    correct_answer INT,
    -- Index of correct option (0-based)
    -- For descriptive questions
    sample_answer TEXT,
    marking_rubric TEXT,
    FOREIGN KEY (created_by) REFERENCES teachers(id) ON DELETE CASCADE,
    INDEX idx_created_by (created_by),
    INDEX idx_type (type),
    INDEX idx_topic (topic),
    INDEX idx_difficulty (difficulty)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
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
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- ============================================
-- QUIZ_ATTEMPTS TABLE (Enhanced with reset fields)
-- ============================================
CREATE TABLE quiz_attempts (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    quiz_id CHAR(36) NOT NULL,
    student_id CHAR(36) NOT NULL,
    attempt_number INT NOT NULL DEFAULT 1,
    -- Attempt lifecycle
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP NULL,
    status ENUM(
        'in_progress',
        'submitted',
        'graded',
        'auto_submitted'
    ) NOT NULL DEFAULT 'in_progress',
    -- Scoring
    score DECIMAL(5, 2),
    total_marks INT,
    percentage DECIMAL(5, 2),
    passed BOOLEAN,
    -- Anti-cheating
    total_violations INT DEFAULT 0,
    auto_submitted_due_to_violations BOOLEAN DEFAULT FALSE,
    -- Browser/device info
    ip_address VARCHAR(45),
    -- IPv6 support
    user_agent TEXT,
    -- Attempt reset fields
    is_reset BOOLEAN DEFAULT FALSE,
    reset_by CHAR(36),
    reset_at TIMESTAMP NULL,
    reset_reason TEXT,
    original_max_attempts INT,
    additional_attempts_granted INT DEFAULT 0,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (reset_by) REFERENCES teachers(id) ON DELETE
    SET NULL,
        UNIQUE KEY unique_attempt (quiz_id, student_id, attempt_number),
        INDEX idx_quiz_id (quiz_id),
        INDEX idx_student_id (student_id),
        INDEX idx_status (status),
        INDEX idx_attempts_reset (is_reset, reset_by)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
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
    FOREIGN KEY (graded_by) REFERENCES teachers(id) ON DELETE
    SET NULL,
        INDEX idx_attempt_id (attempt_id),
        INDEX idx_question_id (question_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- ============================================
-- VIOLATIONS TABLE
-- ============================================
CREATE TABLE violations (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    attempt_id CHAR(36) NOT NULL,
    violation_type ENUM(
        'tab_switch',
        'fullscreen_exit',
        'copy_attempt',
        'paste_attempt',
        'right_click',
        'focus_lost',
        'multiple_windows'
    ) NOT NULL,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    question_index INT,
    severity ENUM('low', 'medium', 'high'),
    metadata JSON,
    FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    INDEX idx_attempt_id (attempt_id),
    INDEX idx_violation_type (violation_type)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- ============================================
-- NOTIFICATIONS TABLE (Enhanced)
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
    -- Enhanced fields
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    category ENUM(
        'quiz',
        'grade',
        'system',
        'attempt_reset',
        'violation'
    ) DEFAULT 'system',
    action_url VARCHAR(500),
    expires_at TIMESTAMP NULL,
    metadata JSON,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_notifications_priority (priority),
    INDEX idx_notifications_category (category),
    INDEX idx_notifications_expires (expires_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- ============================================
-- NOTIFICATION EVENTS TABLE
-- ============================================
CREATE TABLE notification_events (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    event_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id CHAR(36) NOT NULL,
    triggered_by CHAR(36),
    recipients JSON NOT NULL,
    -- Array of user IDs who should be notified
    notification_template VARCHAR(100) NOT NULL,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP NULL,
    FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE
    SET NULL,
        INDEX idx_events_type (event_type),
        INDEX idx_events_processed (processed),
        INDEX idx_events_created (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- ============================================
-- ATTEMPT HISTORY TABLE
-- ============================================
CREATE TABLE attempt_history (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    quiz_id CHAR(36) NOT NULL,
    student_id CHAR(36) NOT NULL,
    attempt_number INT NOT NULL,
    status ENUM(
        'in_progress',
        'submitted',
        'graded',
        'auto_submitted'
    ) NOT NULL,
    score DECIMAL(5, 2),
    total_marks INT,
    percentage DECIMAL(5, 2),
    total_violations INT DEFAULT 0,
    auto_submitted_due_to_violations BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP NOT NULL,
    submitted_at TIMESTAMP NULL,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    -- False when attempt is reset
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_history_quiz_student (quiz_id, student_id),
    INDEX idx_history_status (status),
    INDEX idx_history_active (is_active)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
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
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
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
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE
    SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_action (action),
        INDEX idx_created_at (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- ============================================
-- SAMPLE DATA INSERTION
-- ============================================
-- Insert Admin User
INSERT INTO users (
        id,
        email,
        password_hash,
        role,
        name,
        is_email_verified
    )
VALUES (
        UUID(),
        'admin@quizmaster.com',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LFvO6',
        'admin',
        'System Administrator',
        TRUE
    );
-- Insert Sample Teacher
INSERT INTO users (
        id,
        email,
        password_hash,
        role,
        name,
        is_email_verified
    )
VALUES (
        UUID(),
        'teacher@quizmaster.com',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LFvO6',
        'teacher',
        'John Teacher',
        TRUE
    );
-- Insert Sample Student
INSERT INTO users (
        id,
        email,
        password_hash,
        role,
        name,
        is_email_verified
    )
VALUES (
        UUID(),
        'student@quizmaster.com',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LFvO6',
        'student',
        'Jane Student',
        TRUE
    );
-- ============================================
-- NOTES FOR SETUP
-- ============================================
-- 1. Update the password hashes with actual bcrypt hashes for your users
-- 2. Configure your .env file with database connection details
-- 3. Run 'flask db init', 'flask db migrate', and 'flask db upgrade' for migrations
-- 4. The default password for sample users is 'password123'
-- 5. Make sure MySQL 8.0+ is installed and running
-- 6. Create the database and user with appropriate permissions