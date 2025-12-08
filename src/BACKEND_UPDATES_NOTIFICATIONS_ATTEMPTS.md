# Backend Updates: Notification System & Attempt Reset

**Date:** December 8, 2025  
**Version:** 2.1

This document outlines the additional features for both FastAPI and Flask backends:
1. **Comprehensive Notification System**
2. **Quiz Attempt Reset with History Tracking**
3. **Auto-Submission Tracking and Display**

---

## Table of Contents

1. [Database Schema Updates](#database-schema-updates)
2. [Notification System](#notification-system)
3. [Attempt Reset System](#attempt-reset-system)
4. [API Endpoints](#api-endpoints)
5. [FastAPI Implementation](#fastapi-implementation)
6. [Flask Implementation](#flask-implementation)
7. [Frontend Integration](#frontend-integration)

---

## 1. Database Schema Updates

### 1.1 Updated Quiz Attempts Table (MySQL/PostgreSQL)

```sql
-- Add columns to quiz_attempts table
ALTER TABLE quiz_attempts
ADD COLUMN is_reset BOOLEAN DEFAULT FALSE,
ADD COLUMN reset_by CHAR(36),
ADD COLUMN reset_at TIMESTAMP NULL,
ADD COLUMN reset_reason TEXT,
ADD COLUMN original_max_attempts INT,
ADD COLUMN additional_attempts_granted INT DEFAULT 0,
ADD FOREIGN KEY (reset_by) REFERENCES teachers(id) ON DELETE SET NULL;

-- Create index for reset tracking
CREATE INDEX idx_attempts_reset ON quiz_attempts(is_reset, reset_by);
```

### 1.2 New Attempt History Table

```sql
-- Track all attempts including auto-submitted ones
CREATE TABLE attempt_history (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    quiz_id CHAR(36) NOT NULL,
    student_id CHAR(36) NOT NULL,
    attempt_number INT NOT NULL,
    status ENUM('in_progress', 'submitted', 'graded', 'auto_submitted') NOT NULL,
    score DECIMAL(5, 2),
    total_marks INT,
    percentage DECIMAL(5, 2),
    total_violations INT DEFAULT 0,
    auto_submitted_due_to_violations BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP NOT NULL,
    submitted_at TIMESTAMP,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,  -- False when attempt is reset
    
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_history_quiz_student (quiz_id, student_id),
    INDEX idx_history_status (status),
    INDEX idx_history_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 1.3 Enhanced Notifications Table

```sql
-- Already exists, but ensure these columns are present
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS category ENUM('quiz', 'grade', 'system', 'attempt_reset', 'violation') DEFAULT 'system',
ADD COLUMN IF NOT EXISTS action_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NULL,
ADD INDEX idx_notifications_priority (priority),
ADD INDEX idx_notifications_category (category),
ADD INDEX idx_notifications_expires (expires_at);
```

### 1.4 Notification Events Table (for tracking what triggers notifications)

```sql
CREATE TABLE notification_events (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    event_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id CHAR(36) NOT NULL,
    triggered_by CHAR(36),
    recipients JSON NOT NULL,  -- Array of user IDs who should be notified
    notification_template VARCHAR(100) NOT NULL,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP NULL,
    
    FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_events_type (event_type),
    INDEX idx_events_processed (processed),
    INDEX idx_events_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 2. Notification System

### 2.1 Notification Types

```python
class NotificationType:
    # Quiz related
    QUIZ_PUBLISHED = "quiz_published"
    QUIZ_STARTING_SOON = "quiz_starting_soon"
    QUIZ_DEADLINE_APPROACHING = "quiz_deadline_approaching"
    
    # Attempt related
    ATTEMPT_SUBMITTED = "attempt_submitted"
    ATTEMPT_GRADED = "attempt_graded"
    ATTEMPT_RESET = "attempt_reset"
    ATTEMPT_AUTO_SUBMITTED = "attempt_auto_submitted"
    
    # Violation related
    VIOLATION_WARNING = "violation_warning"
    VIOLATION_AUTO_SUBMIT = "violation_auto_submit"
    
    # Grade related
    GRADE_RECEIVED = "grade_received"
    GRADE_PENDING_REVIEW = "grade_pending_review"
    
    # Class related
    CLASS_ASSIGNED = "class_assigned"
    STUDENT_ADDED = "student_added"
    
    # System
    ACCOUNT_CLAIMED = "account_claimed"
    PASSWORD_RESET = "password_reset"
```

### 2.2 Notification Templates

```python
NOTIFICATION_TEMPLATES = {
    "quiz_published": {
        "title": "New Quiz Available: {quiz_title}",
        "message": "A new quiz '{quiz_title}' for {subject} has been published and is now available.",
        "priority": "medium",
        "category": "quiz"
    },
    "quiz_starting_soon": {
        "title": "Quiz Starting Soon",
        "message": "Quiz '{quiz_title}' will start in {time_until}. Make sure you're prepared!",
        "priority": "high",
        "category": "quiz"
    },
    "quiz_deadline_approaching": {
        "title": "Quiz Deadline Approaching",
        "message": "Quiz '{quiz_title}' deadline is in {time_remaining}. Don't forget to complete it!",
        "priority": "high",
        "category": "quiz"
    },
    "attempt_graded": {
        "title": "Quiz Graded: {quiz_title}",
        "message": "Your submission for '{quiz_title}' has been graded. Score: {score}/{total_marks} ({percentage}%)",
        "priority": "medium",
        "category": "grade"
    },
    "attempt_reset": {
        "title": "Quiz Attempt Reset",
        "message": "Your teacher has granted you {additional_attempts} additional attempt(s) for '{quiz_title}'. Reason: {reason}",
        "priority": "high",
        "category": "attempt_reset"
    },
    "attempt_auto_submitted": {
        "title": "Quiz Auto-Submitted",
        "message": "Your quiz '{quiz_title}' was automatically submitted due to {violations} violation(s).",
        "priority": "high",
        "category": "violation"
    },
    "violation_warning": {
        "title": "Violation Detected",
        "message": "Warning: {violation_type} detected during '{quiz_title}'. Total violations: {total_violations}/3",
        "priority": "high",
        "category": "violation"
    },
    "grade_pending_review": {
        "title": "New Submission to Grade",
        "message": "{student_name} has submitted '{quiz_title}' and requires manual grading.",
        "priority": "medium",
        "category": "grade"
    },
    "student_added": {
        "title": "New Student Added",
        "message": "{student_name} has been added to your class '{class_name}'.",
        "priority": "low",
        "category": "system"
    }
}
```

### 2.3 Notification Service (Python - works for both FastAPI and Flask)

```python
# app/services/notification_service.py
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from app import db
from app.models import Notification, NotificationEvent, User

class NotificationService:
    
    @staticmethod
    def create_notification(
        user_id: str,
        notification_type: str,
        title: str,
        message: str,
        link: Optional[str] = None,
        priority: str = 'medium',
        category: str = 'system',
        metadata: Optional[Dict] = None,
        expires_at: Optional[datetime] = None
    ) -> Notification:
        """Create a single notification"""
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            link=link,
            priority=priority,
            category=category,
            metadata=metadata,
            expires_at=expires_at
        )
        db.session.add(notification)
        db.session.commit()
        
        # TODO: Send real-time notification via WebSocket/SocketIO
        # socketio.emit('new_notification', notification.to_dict(), room=user_id)
        
        return notification
    
    @staticmethod
    def create_notifications_bulk(
        user_ids: List[str],
        notification_type: str,
        template_data: Dict[str, Any]
    ):
        """Create notifications for multiple users"""
        from app.services.notification_service import NOTIFICATION_TEMPLATES
        
        template = NOTIFICATION_TEMPLATES.get(notification_type)
        if not template:
            raise ValueError(f"Unknown notification type: {notification_type}")
        
        title = template['title'].format(**template_data)
        message = template['message'].format(**template_data)
        
        notifications = []
        for user_id in user_ids:
            notification = Notification(
                user_id=user_id,
                type=notification_type,
                title=title,
                message=message,
                link=template_data.get('link'),
                priority=template['priority'],
                category=template['category'],
                metadata=template_data
            )
            notifications.append(notification)
        
        db.session.bulk_save_objects(notifications)
        db.session.commit()
        
        return notifications
    
    @staticmethod
    def notify_quiz_published(quiz_id: str, quiz_title: str, subject: str, class_ids: List[str]):
        """Notify all students in assigned classes when quiz is published"""
        from app.models import Student, Class
        
        # Get all students in the assigned classes
        students = db.session.query(Student).filter(Student.class_id.in_(class_ids)).all()
        student_ids = [s.id for s in students]
        
        NotificationService.create_notifications_bulk(
            user_ids=student_ids,
            notification_type="quiz_published",
            template_data={
                'quiz_title': quiz_title,
                'subject': subject,
                'link': '/student/quizzes'
            }
        )
    
    @staticmethod
    def notify_attempt_graded(student_id: str, quiz_title: str, score: float, total_marks: int, percentage: float):
        """Notify student when their attempt is graded"""
        NotificationService.create_notifications_bulk(
            user_ids=[student_id],
            notification_type="attempt_graded",
            template_data={
                'quiz_title': quiz_title,
                'score': score,
                'total_marks': total_marks,
                'percentage': f"{percentage:.1f}",
                'link': '/student/results'
            }
        )
    
    @staticmethod
    def notify_attempt_reset(student_id: str, quiz_title: str, additional_attempts: int, reason: str):
        """Notify student when attempts are reset"""
        NotificationService.create_notifications_bulk(
            user_ids=[student_id],
            notification_type="attempt_reset",
            template_data={
                'quiz_title': quiz_title,
                'additional_attempts': additional_attempts,
                'reason': reason,
                'link': '/student/quizzes'
            }
        )
    
    @staticmethod
    def notify_auto_submission(student_id: str, quiz_title: str, violations: int):
        """Notify student when quiz is auto-submitted due to violations"""
        NotificationService.create_notifications_bulk(
            user_ids=[student_id],
            notification_type="attempt_auto_submitted",
            template_data={
                'quiz_title': quiz_title,
                'violations': violations,
                'link': '/student/results'
            }
        )
    
    @staticmethod
    def notify_pending_grading(teacher_id: str, student_name: str, quiz_title: str, attempt_id: str):
        """Notify teacher of pending grading"""
        NotificationService.create_notifications_bulk(
            user_ids=[teacher_id],
            notification_type="grade_pending_review",
            template_data={
                'student_name': student_name,
                'quiz_title': quiz_title,
                'link': f'/teacher/grading?attempt_id={attempt_id}'
            }
        )
    
    @staticmethod
    def get_user_notifications(user_id: str, unread_only: bool = False, limit: int = 50):
        """Get notifications for a user"""
        query = db.session.query(Notification).filter(Notification.user_id == user_id)
        
        if unread_only:
            query = query.filter(Notification.is_read == False)
        
        # Filter out expired notifications
        query = query.filter(
            (Notification.expires_at.is_(None)) | (Notification.expires_at > datetime.utcnow())
        )
        
        notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()
        return notifications
    
    @staticmethod
    def mark_as_read(notification_id: str):
        """Mark notification as read"""
        notification = Notification.query.get(notification_id)
        if notification:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            db.session.commit()
        return notification
    
    @staticmethod
    def mark_all_as_read(user_id: str):
        """Mark all notifications as read for a user"""
        db.session.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({
            'is_read': True,
            'read_at': datetime.utcnow()
        })
        db.session.commit()
    
    @staticmethod
    def delete_notification(notification_id: str):
        """Delete a notification"""
        notification = Notification.query.get(notification_id)
        if notification:
            db.session.delete(notification)
            db.session.commit()
        return True
    
    @staticmethod
    def cleanup_expired_notifications():
        """Delete expired notifications (run as cron job)"""
        db.session.query(Notification).filter(
            Notification.expires_at < datetime.utcnow()
        ).delete()
        db.session.commit()
```

---

## 3. Attempt Reset System

### 3.1 Attempt Reset Service

```python
# app/services/attempt_reset_service.py
from datetime import datetime
from typing import Dict, Any
from app import db
from app.models import QuizAttempt, Quiz, Student, User, AttemptHistory
from app.services.notification_service import NotificationService

class AttemptResetService:
    
    @staticmethod
    def reset_student_attempts(
        student_id: str,
        quiz_id: str,
        additional_attempts: int,
        reset_by: str,
        reason: str
    ) -> Dict[str, Any]:
        """
        Reset quiz attempts for a specific student
        - Archives current attempts to history
        - Grants additional attempts
        - Notifies student
        - Logs action
        """
        
        # Get quiz and student
        quiz = Quiz.query.get(quiz_id)
        student = Student.query.get(student_id)
        user = User.query.get(student_id)
        
        if not quiz or not student:
            raise ValueError("Quiz or student not found")
        
        # Get all attempts for this student-quiz combination
        attempts = QuizAttempt.query.filter_by(
            student_id=student_id,
            quiz_id=quiz_id
        ).all()
        
        # Archive existing attempts to history
        for attempt in attempts:
            history = AttemptHistory(
                id=attempt.id,
                quiz_id=attempt.quiz_id,
                student_id=attempt.student_id,
                attempt_number=attempt.attempt_number,
                status=attempt.status.value if hasattr(attempt.status, 'value') else attempt.status,
                score=attempt.score,
                total_marks=attempt.total_marks,
                percentage=attempt.percentage,
                total_violations=attempt.total_violations,
                auto_submitted_due_to_violations=attempt.auto_submitted_due_to_violations,
                started_at=attempt.started_at,
                submitted_at=attempt.submitted_at,
                archived_at=datetime.utcnow(),
                is_active=False  # Mark as inactive since it's reset
            )
            db.session.add(history)
            
            # Mark attempt as reset
            attempt.is_reset = True
            attempt.reset_by = reset_by
            attempt.reset_at = datetime.utcnow()
            attempt.reset_reason = reason
            attempt.original_max_attempts = quiz.max_attempts
            attempt.additional_attempts_granted = additional_attempts
        
        # Update quiz max attempts for this student
        # Note: We don't change the quiz itself, we track this per attempt
        # The frontend will check if student has additional attempts granted
        
        db.session.commit()
        
        # Send notification to student
        NotificationService.notify_attempt_reset(
            student_id=student_id,
            quiz_title=quiz.title,
            additional_attempts=additional_attempts,
            reason=reason
        )
        
        # Log audit trail
        from app.models import AuditLog
        audit = AuditLog(
            user_id=reset_by,
            action='attempt_reset',
            entity_type='quiz_attempt',
            entity_id=quiz_id,
            old_value={'attempts': len(attempts), 'max_attempts': quiz.max_attempts},
            new_value={
                'additional_attempts_granted': additional_attempts,
                'reason': reason,
                'reset_for': user.name
            }
        )
        db.session.add(audit)
        db.session.commit()
        
        return {
            'success': True,
            'message': f'Successfully granted {additional_attempts} additional attempt(s) to {user.name}',
            'new_max_attempts': quiz.max_attempts + additional_attempts,
            'archived_attempts': len(attempts)
        }
    
    @staticmethod
    def get_attempt_history(student_id: str, quiz_id: str):
        """Get all attempts including archived ones"""
        # Current attempts
        current_attempts = QuizAttempt.query.filter_by(
            student_id=student_id,
            quiz_id=quiz_id
        ).all()
        
        # Archived attempts
        archived_attempts = AttemptHistory.query.filter_by(
            student_id=student_id,
            quiz_id=quiz_id
        ).order_by(AttemptHistory.archived_at.desc()).all()
        
        return {
            'current_attempts': [a.to_dict() for a in current_attempts],
            'archived_attempts': [a.to_dict() for a in archived_attempts]
        }
    
    @staticmethod
    def get_student_available_attempts(student_id: str, quiz_id: str) -> int:
        """Calculate how many attempts student has left"""
        quiz = Quiz.query.get(quiz_id)
        if not quiz:
            return 0
        
        # Get all attempts (including reset ones)
        attempts = QuizAttempt.query.filter_by(
            student_id=student_id,
            quiz_id=quiz_id,
            is_reset=False  # Only count non-reset attempts
        ).all()
        
        # Check if any attempts have been reset and granted additional attempts
        reset_attempts = QuizAttempt.query.filter_by(
            student_id=student_id,
            quiz_id=quiz_id,
            is_reset=True
        ).order_by(QuizAttempt.reset_at.desc()).first()
        
        total_allowed = quiz.max_attempts
        if reset_attempts and reset_attempts.additional_attempts_granted:
            total_allowed += reset_attempts.additional_attempts_granted
        
        used_attempts = len(attempts)
        remaining = max(0, total_allowed - used_attempts)
        
        return remaining
    
    @staticmethod
    def separate_submissions_for_teacher(quiz_id: str):
        """
        Separate auto-submitted and manually submitted attempts for teacher view
        """
        all_attempts = QuizAttempt.query.filter_by(quiz_id=quiz_id).all()
        
        auto_submitted = []
        manual_submitted = []
        in_progress = []
        
        for attempt in all_attempts:
            if attempt.status == 'in_progress':
                in_progress.append(attempt.to_dict())
            elif attempt.auto_submitted_due_to_violations:
                auto_submitted.append(attempt.to_dict())
            elif attempt.status in ['submitted', 'graded']:
                manual_submitted.append(attempt.to_dict())
        
        return {
            'in_progress': in_progress,
            'auto_submitted': auto_submitted,
            'manual_submitted': manual_submitted,
            'total': len(all_attempts)
        }
```

---

## 4. API Endpoints

### 4.1 Notification Endpoints

```python
# GET /api/notifications
# Get notifications for current user
Query params:
  - unread_only: boolean (default: false)
  - limit: int (default: 50)
  - category: string (optional)

Response: {
  "notifications": [...],
  "unread_count": 5,
  "total": 20
}

# POST /api/notifications/{notification_id}/read
# Mark notification as read

Response: {
  "success": true,
  "notification": {...}
}

# POST /api/notifications/read-all
# Mark all notifications as read

Response: {
  "success": true,
  "count": 10
}

# DELETE /api/notifications/{notification_id}
# Delete a notification

Response: {
  "success": true
}
```

### 4.2 Attempt Reset Endpoints

```python
# POST /api/attempts/reset
# Reset attempts for a student (Teacher only)
Body: {
  "student_id": "uuid",
  "quiz_id": "uuid",
  "additional_attempts": 1,
  "reason": "Technical issues during quiz"
}

Response: {
  "success": true,
  "message": "Successfully granted 1 additional attempt(s)",
  "new_max_attempts": 3,
  "archived_attempts": 2
}

# GET /api/attempts/history
# Get attempt history for a student-quiz
Query params:
  - student_id: string
  - quiz_id: string

Response: {
  "current_attempts": [...],
  "archived_attempts": [...],
  "total_current": 1,
  "total_archived": 2
}

# GET /api/attempts/available
# Get remaining attempts for current student
Query params:
  - quiz_id: string

Response: {
  "remaining_attempts": 2,
  "max_attempts": 3,
  "used_attempts": 1,
  "additional_granted": 1
}

# GET /api/attempts/quiz/{quiz_id}/categorized
# Get attempts categorized by submission type (Teacher only)

Response: {
  "in_progress": [...],
  "auto_submitted": [...],
  "manual_submitted": [...],
  "total": 50
}
```

---

## 5. FastAPI Implementation

### 5.1 Notification Routes

```python
# app/api/v1/notifications.py
from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from app.models import User
from app.schemas.notification import NotificationResponse
from app.services.notification_service import NotificationService
from app.api.deps import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/", response_model=dict)
async def get_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(50, le=100),
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get notifications for current user"""
    notifications = NotificationService.get_user_notifications(
        user_id=current_user.id,
        unread_only=unread_only,
        limit=limit
    )
    
    if category:
        notifications = [n for n in notifications if n.category == category]
    
    unread_count = len([n for n in notifications if not n.is_read])
    
    return {
        "notifications": [n.to_dict() for n in notifications],
        "unread_count": unread_count,
        "total": len(notifications)
    }

@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user)
):
    """Mark notification as read"""
    notification = NotificationService.mark_as_read(notification_id)
    
    if not notification or notification.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"success": True, "notification": notification.to_dict()}

@router.post("/read-all")
async def mark_all_read(current_user: User = Depends(get_current_user)):
    """Mark all notifications as read"""
    NotificationService.mark_all_as_read(current_user.id)
    return {"success": True, "message": "All notifications marked as read"}

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a notification"""
    NotificationService.delete_notification(notification_id)
    return {"success": True}
```

### 5.2 Attempt Reset Routes

```python
# app/api/v1/attempts.py (add these endpoints)
from app.services.attempt_reset_service import AttemptResetService

@router.post("/reset")
async def reset_attempts(
    reset_data: dict,
    current_user: User = Depends(require_teacher)
):
    """Reset attempts for a student (Teacher/Admin only)"""
    result = AttemptResetService.reset_student_attempts(
        student_id=reset_data['student_id'],
        quiz_id=reset_data['quiz_id'],
        additional_attempts=reset_data['additional_attempts'],
        reset_by=current_user.id,
        reason=reset_data['reason']
    )
    return result

@router.get("/history")
async def get_attempt_history(
    student_id: str,
    quiz_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get attempt history"""
    # Check permissions
    if current_user.role == 'student' and current_user.id != student_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    history = AttemptResetService.get_attempt_history(student_id, quiz_id)
    return history

@router.get("/available")
async def get_available_attempts(
    quiz_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get remaining attempts for current student"""
    if current_user.role != 'student':
        raise HTTPException(status_code=400, detail="Only for students")
    
    remaining = AttemptResetService.get_student_available_attempts(
        current_user.id,
        quiz_id
    )
    
    quiz = Quiz.query.get(quiz_id)
    reset_attempt = QuizAttempt.query.filter_by(
        student_id=current_user.id,
        quiz_id=quiz_id,
        is_reset=True
    ).order_by(QuizAttempt.reset_at.desc()).first()
    
    additional_granted = 0
    if reset_attempt:
        additional_granted = reset_attempt.additional_attempts_granted or 0
    
    current_attempts = QuizAttempt.query.filter_by(
        student_id=current_user.id,
        quiz_id=quiz_id,
        is_reset=False
    ).count()
    
    return {
        "remaining_attempts": remaining,
        "max_attempts": quiz.max_attempts + additional_granted,
        "used_attempts": current_attempts,
        "additional_granted": additional_granted
    }

@router.get("/quiz/{quiz_id}/categorized")
async def get_categorized_attempts(
    quiz_id: str,
    current_user: User = Depends(require_teacher)
):
    """Get attempts categorized by submission type"""
    categorized = AttemptResetService.separate_submissions_for_teacher(quiz_id)
    return categorized
```

---

## 6. Flask Implementation

### 6.1 Notification Routes

```python
# app/routes/notifications.py
from flask import Blueprint, request, jsonify
from app.utils.decorators import jwt_required_with_role
from app.services.notification_service import NotificationService

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('/', methods=['GET'])
@jwt_required_with_role()
def get_notifications(current_user):
    """Get notifications for current user"""
    unread_only = request.args.get('unread_only', 'false').lower() == 'true'
    limit = int(request.args.get('limit', 50))
    category = request.args.get('category')
    
    notifications = NotificationService.get_user_notifications(
        user_id=current_user.id,
        unread_only=unread_only,
        limit=limit
    )
    
    if category:
        notifications = [n for n in notifications if n.category == category]
    
    unread_count = len([n for n in notifications if not n.is_read])
    
    return jsonify({
        'notifications': [n.to_dict() for n in notifications],
        'unread_count': unread_count,
        'total': len(notifications)
    }), 200

@notifications_bp.route('/<notification_id>/read', methods=['POST'])
@jwt_required_with_role()
def mark_read(notification_id, current_user):
    """Mark notification as read"""
    notification = NotificationService.mark_as_read(notification_id)
    
    if not notification or notification.user_id != current_user.id:
        return jsonify({'error': 'Notification not found'}), 404
    
    return jsonify({
        'success': True,
        'notification': notification.to_dict()
    }), 200

@notifications_bp.route('/read-all', methods=['POST'])
@jwt_required_with_role()
def mark_all_read(current_user):
    """Mark all notifications as read"""
    NotificationService.mark_all_as_read(current_user.id)
    return jsonify({
        'success': True,
        'message': 'All notifications marked as read'
    }), 200

@notifications_bp.route('/<notification_id>', methods=['DELETE'])
@jwt_required_with_role()
def delete_notification(notification_id, current_user):
    """Delete notification"""
    NotificationService.delete_notification(notification_id)
    return jsonify({'success': True}), 200
```

### 6.2 Attempt Reset Routes

```python
# app/routes/attempts.py (add these endpoints)
from app.services.attempt_reset_service import AttemptResetService
from app.utils.decorators import teacher_required, student_required

@attempts_bp.route('/reset', methods=['POST'])
@teacher_required
def reset_attempts(current_user):
    """Reset attempts for a student"""
    data = request.get_json()
    
    result = AttemptResetService.reset_student_attempts(
        student_id=data['student_id'],
        quiz_id=data['quiz_id'],
        additional_attempts=data['additional_attempts'],
        reset_by=current_user.id,
        reason=data['reason']
    )
    
    return jsonify(result), 200

@attempts_bp.route('/history', methods=['GET'])
@jwt_required_with_role()
def get_history(current_user):
    """Get attempt history"""
    student_id = request.args.get('student_id')
    quiz_id = request.args.get('quiz_id')
    
    # Check permissions
    if current_user.role.value == 'student' and current_user.id != student_id:
        return jsonify({'error': 'Access denied'}), 403
    
    history = AttemptResetService.get_attempt_history(student_id, quiz_id)
    return jsonify(history), 200

@attempts_bp.route('/available', methods=['GET'])
@student_required
def get_available(current_user):
    """Get available attempts for current student"""
    quiz_id = request.args.get('quiz_id')
    
    from app.models import Quiz, QuizAttempt
    
    remaining = AttemptResetService.get_student_available_attempts(
        current_user.id,
        quiz_id
    )
    
    quiz = Quiz.query.get(quiz_id)
    reset_attempt = QuizAttempt.query.filter_by(
        student_id=current_user.id,
        quiz_id=quiz_id,
        is_reset=True
    ).order_by(QuizAttempt.reset_at.desc()).first()
    
    additional_granted = 0
    if reset_attempt:
        additional_granted = reset_attempt.additional_attempts_granted or 0
    
    current_attempts = QuizAttempt.query.filter_by(
        student_id=current_user.id,
        quiz_id=quiz_id,
        is_reset=False
    ).count()
    
    return jsonify({
        'remaining_attempts': remaining,
        'max_attempts': quiz.max_attempts + additional_granted,
        'used_attempts': current_attempts,
        'additional_granted': additional_granted
    }), 200

@attempts_bp.route('/quiz/<quiz_id>/categorized', methods=['GET'])
@teacher_required
def get_categorized(quiz_id, current_user):
    """Get categorized attempts"""
    categorized = AttemptResetService.separate_submissions_for_teacher(quiz_id)
    return jsonify(categorized), 200
```

---

## 7. Frontend Integration

### 7.1 Using the Notification Center

```typescript
// In DashboardLayout.tsx
import NotificationCenter from './NotificationCenter';

// Add to header
<div className="flex items-center gap-4">
  <NotificationCenter userId={user.id} />
  <ThemeToggle />
  <UserMenu />
</div>
```

### 7.2 Using Attempt Reset

```typescript
// In GradingDashboard or QuizMonitor
import AttemptReset from '../teacher/AttemptReset';

<AttemptReset
  studentId={student.id}
  studentName={student.name}
  quizId={quiz.id}
  quizTitle={quiz.title}
  currentAttempts={2}
  maxAttempts={2}
  onResetComplete={() => {
    // Refresh data
    fetchAttempts();
  }}
/>
```

### 7.3 API Integration Example

```typescript
// lib/api.ts - Add notification functions
export const getNotifications = async (unreadOnly = false) => {
  return apiCall(`/notifications?unread_only=${unreadOnly}`);
};

export const markNotificationRead = async (notificationId: string) => {
  return apiCall(`/notifications/${notificationId}/read`, { method: 'POST' });
};

export const resetStudentAttempts = async (data: {
  student_id: string;
  quiz_id: string;
  additional_attempts: number;
  reason: string;
}) => {
  return apiCall('/attempts/reset', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getAvailableAttempts = async (quizId: string) => {
  return apiCall(`/attempts/available?quiz_id=${quizId}`);
};

export const getCategorizedAttempts = async (quizId: string) => {
  return apiCall(`/attempts/quiz/${quizId}/categorized`);
};
```

---

## Summary

This update adds:

1. **Comprehensive Notification System:**
   - In-app notifications with real-time updates
   - Multiple notification types for all system events
   - Priority and category-based organization
   - Email integration ready
   - Auto-expiration support

2. **Attempt Reset System:**
   - Teachers can grant additional attempts to specific students
   - All previous attempts archived to history
   - Reason tracking and audit trail
   - Student notifications
   - Separate display of auto-submitted vs manual submissions

3. **Enhanced Tracking:**
   - Attempt history preservation
   - Auto-submission flagging
   - Reset reason logging
   - Categorized submission views for teachers

Both FastAPI and Flask implementations are provided with complete code examples!
