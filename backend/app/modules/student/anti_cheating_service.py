from datetime import datetime
from flask import current_app
from app.models import QuizAttempt, Violation
from app import db
import json
import hashlib


class AntiCheatService:

    @staticmethod
    def verify_access_code(attempt_id: str, access_code: str, device_info: dict):
        """Verify access code for quiz attempt"""
        try:
            attempt = QuizAttempt.query.filter_by(id=attempt_id).first()
            if not attempt:
                return {"error": "Attempt not found"}, 404

            # Generate expected access code (teacher-provided fresh code)
            # In real implementation, this would come from teacher dashboard
            expected_code = hashlib.sha256(
                f"{attempt.id}_{attempt.started_at}".encode()).hexdigest()[:8].upper()

            if access_code.upper() != expected_code:
                # Log failed attempt
                AntiCheatService.log_violation(attempt_id, "INVALID_ACCESS_CODE", {
                    "attempted_code": access_code,
                    "device_info": device_info
                })
                return {"error": "Invalid access code"}, 401

            # Store device info
            attempt.ip_address = device_info.get('ip', '')
            attempt.user_agent = device_info.get('userAgent', '')

            # Update status to show access verified
            db.session.commit()

            return {"message": "Access verified successfully"}, 200

        except Exception as e:
            current_app.logger.error(f"Error verifying access code: {str(e)}")
            return {"error": "Internal server error"}, 500

    @staticmethod
    def log_violation(attempt_id: str, violation_type: str, details: dict = None):
        """Log cheating violation"""
        try:
            attempt = QuizAttempt.query.filter_by(id=attempt_id).first()
            if not attempt:
                return {"error": "Attempt not found"}, 404

            # Create violation record
            violation = Violation(
                attempt_id=attempt_id,
                type=violation_type,
                details=json.dumps(details) if details else None,
                timestamp=datetime.utcnow()
            )

            # Update attempt violation count
            attempt.total_violations = (attempt.total_violations or 0) + 1

            # Auto-submit if too many violations
            if attempt.total_violations >= 5:
                attempt.status = 'AUTO_SUBMITTED'
                attempt.submitted_at = datetime.utcnow()
                attempt.auto_submitted_due_to_violations = True

            db.session.add(violation)
            db.session.commit()

            return {"message": "Violation logged successfully"}, 200

        except Exception as e:
            current_app.logger.error(f"Error logging violation: {str(e)}")
            return {"error": "Internal server error"}, 500

    @staticmethod
    def get_violation_report(attempt_id: str):
        """Get comprehensive violation report for an attempt"""
        try:
            attempt = QuizAttempt.query.filter_by(id=attempt_id).first()
            if not attempt:
                return {"error": "Attempt not found"}, 404

            violations = Violation.query.filter_by(attempt_id=attempt_id).all()

            violation_report = {
                "attempt_id": attempt_id,
                "student_id": attempt.student_id,
                "quiz_id": attempt.quiz_id,
                "total_violations": attempt.total_violations,
                "auto_submitted": attempt.auto_submitted_due_to_violations,
                "violations": [
                    {
                        "type": v.type,
                        "timestamp": v.timestamp.isoformat(),
                        "details": json.loads(v.details) if v.details else None
                    }
                    for v in violations
                ],
                "device_info": {
                    "ip_address": attempt.ip_address,
                    "user_agent": attempt.user_agent,
                    "started_at": attempt.started_at.isoformat() if attempt.started_at else None,
                    "submitted_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None
                }
            }

            return {"data": violation_report}, 200

        except Exception as e:
            current_app.logger.error(
                f"Error getting violation report: {str(e)}")
            return {"error": "Internal server error"}, 500

    @staticmethod
    def get_device_info(attempt_id: str):
        """Get device information for an attempt"""
        try:
            attempt = QuizAttempt.query.filter_by(id=attempt_id).first()
            if not attempt:
                return {"error": "Attempt not found"}, 404

            device_info = {
                "ip_address": attempt.ip_address,
                "user_agent": attempt.user_agent,
                "started_at": attempt.started_at.isoformat() if attempt.started_at else None,
                "last_activity_at": attempt.last_activity_at.isoformat() if attempt.last_activity_at else None
            }

            return {"data": device_info}, 200

        except Exception as e:
            current_app.logger.error(f"Error getting device info: {str(e)}")
            return {"error": "Internal server error"}, 500
