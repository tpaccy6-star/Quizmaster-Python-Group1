# Attempt Controller
# Module Owner: Student 7 - Attempt Management Specialist

# Handles HTTP requests for attempt endpoints

from flask import Blueprint, request, jsonify
from app.utils.decorators import jwt_required_with_role, teacher_required, student_required
from app.modules.attempts.attempt_service import AttemptService

attempts_bp = Blueprint('attempts', __name__)


@attempts_bp.route('/<attempt_id>', methods=['GET'])
@jwt_required_with_role()
def get_attempt(current_user, attempt_id):
    """Get a specific attempt"""
    try:
        # Students can only view their own attempts
        user_id = current_user.id if current_user.role.value == 'student' else None

        attempt = AttemptService.get_attempt_by_id(attempt_id, user_id)

        return jsonify({
            'attempt': attempt.to_dict(include_answers=True)
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': 'Failed to fetch attempt', 'details': str(e)}), 500


@attempts_bp.route('/student/<student_id>', methods=['GET'])
@jwt_required_with_role()
def get_student_attempts(current_user, student_id):
    """Get student's attempts"""
    try:
        # Students can only view their own attempts
        if current_user.role.value == 'student' and current_user.id != student_id:
            return jsonify({'error': 'Unauthorized'}), 403

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        quiz_id = request.args.get('quiz_id')

        result = AttemptService.get_student_attempts(
            student_id=student_id,
            quiz_id=quiz_id,
            page=page,
            per_page=per_page
        )

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': 'Failed to fetch attempts', 'details': str(e)}), 500


@attempts_bp.route('/quiz/<quiz_id>', methods=['GET'])
@jwt_required_with_role()
def get_quiz_attempts(current_user, quiz_id):
    """Get attempts for a quiz"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        # Teachers can only view attempts for their quizzes
        teacher_id = current_user.id if current_user.role.value == 'teacher' else None

        result = AttemptService.get_quiz_attempts(
            quiz_id=quiz_id,
            teacher_id=teacher_id,
            page=page,
            per_page=per_page
        )

        return jsonify(result), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 403
    except Exception as e:
        return jsonify({'error': 'Failed to fetch attempts', 'details': str(e)}), 500


@attempts_bp.route('/<attempt_id>/violations', methods=['GET'])
@jwt_required_with_role()
def get_attempt_violations(current_user, attempt_id):
    """Get violations for an attempt"""
    try:
        # Verify attempt ownership
        attempt = AttemptService.get_attempt_by_id(attempt_id)

        if current_user.role.value == 'student' and attempt.student_id != current_user.id:
            return jsonify({'error': 'Unauthorized'}), 403

        violations = AttemptService.get_attempt_violations(attempt_id)

        return jsonify({'violations': violations}), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': 'Failed to fetch violations', 'details': str(e)}), 500


@attempts_bp.route('/<attempt_id>/violations', methods=['POST'])
@student_required
def record_violation(current_user, attempt_id):
    """Record a violation (typically called from frontend)"""
    try:
        data = request.get_json()

        violation_type = data.get('violation_type')
        question_index = data.get('question_index')
        extra_data = data.get('extra_data', {})

        if not violation_type:
            return jsonify({'error': 'violation_type is required'}), 400

        # Verify attempt ownership
        attempt = AttemptService.get_attempt_by_id(attempt_id, current_user.id)

        violation = AttemptService.record_violation(
            attempt_id=attempt_id,
            violation_type=violation_type,
            question_index=question_index,
            extra_data=extra_data
        )

        return jsonify({
            'message': 'Violation recorded',
            'violation': violation.to_dict()
        }), 201

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to record violation', 'details': str(e)}), 500


@attempts_bp.route('/quiz/<quiz_id>/stats', methods=['GET'])
@jwt_required_with_role()
def get_attempt_statistics(current_user, quiz_id):
    """Get statistics for quiz attempts"""
    try:
        # Verify quiz ownership
        from app.models.quiz import Quiz
        quiz = Quiz.query.get(quiz_id)

        if not quiz:
            return jsonify({'error': 'Quiz not found'}), 404

        if current_user.role.value == 'teacher' and quiz.created_by != current_user.id:
            return jsonify({'error': 'Unauthorized'}), 403

        stats = AttemptService.get_attempt_statistics(quiz_id)

        return jsonify(stats), 200

    except Exception as e:
        return jsonify({'error': 'Failed to fetch statistics', 'details': str(e)}), 500


@attempts_bp.route('/student/<student_id>/quiz/<quiz_id>/summary', methods=['GET'])
@jwt_required_with_role()
def get_attempt_summary(current_user, student_id, quiz_id):
    """Get comprehensive attempt summary"""
    try:
        # Students can only view their own summaries
        if current_user.role.value == 'student' and current_user.id != student_id:
            return jsonify({'error': 'Unauthorized'}), 403

        summary = AttemptService.get_student_attempt_summary(
            student_id, quiz_id)

        if not summary:
            return jsonify({'error': 'No attempts found'}), 404

        return jsonify(summary), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': 'Failed to fetch summary', 'details': str(e)}), 500


@attempts_bp.route('/quiz/<quiz_id>/categorized', methods=['GET'])
@teacher_required
def get_categorized_attempts(current_user, quiz_id):
    """Get attempts categorized by submission type"""
    try:
        categorized = AttemptService.get_categorized_attempts(
            quiz_id, current_user.id)

        return jsonify(categorized), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': 'Failed to fetch categorized attempts', 'details': str(e)}), 500


@attempts_bp.route('/<attempt_id>/archive', methods=['POST'])
@teacher_required
def archive_attempt(current_user, attempt_id):
    """Archive an attempt to history"""
    try:
        # Verify attempt ownership
        attempt = AttemptService.get_attempt_by_id(attempt_id)

        if attempt.quiz.created_by != current_user.id:
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json()
        reason = data.get('reason', 'Manual archive')

        history = AttemptService.archive_attempt(attempt_id, reason)

        return jsonify({
            'message': 'Attempt archived successfully',
            'history': history.to_dict()
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': 'Failed to archive attempt', 'details': str(e)}), 500


@attempts_bp.route('/auto-submit-expired', methods=['POST'])
@jwt_required_with_role()
def auto_submit_expired(current_user):
    """Auto-submit expired attempts (admin only)"""
    try:
        from app.models.user import UserRole

        if current_user.role != UserRole.ADMIN:
            return jsonify({'error': 'Unauthorized'}), 403

        count = AttemptService.auto_submit_expired_attempts()

        return jsonify({
            'message': f'Auto-submitted {count} expired attempts'
        }), 200

    except Exception as e:
        return jsonify({'error': 'Failed to auto-submit attempts', 'details': str(e)}), 500
