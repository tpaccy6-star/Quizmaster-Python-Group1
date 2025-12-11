from flask import Blueprint, request, jsonify
from app.utils.decorators import jwt_required_with_role, teacher_required, student_required
from app.services.attempt_reset_service import AttemptResetService
from app.models.quiz_attempt import QuizAttempt
from app.models.quiz import Quiz

# Use a different blueprint name to avoid conflict with attempt_controller
attempts_reset_bp = Blueprint('attempts_reset', __name__)


@attempts_reset_bp.route('/reset', methods=['POST'])
@teacher_required
def reset_attempts(current_user):
    """Reset attempts for a student"""
    data = request.get_json()

    required_fields = ['student_id', 'quiz_id',
                       'additional_attempts', 'reason']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400

    try:
        result = AttemptResetService.reset_student_attempts(
            student_id=data['student_id'],
            quiz_id=data['quiz_id'],
            additional_attempts=data['additional_attempts'],
            reset_by=current_user.id,
            reason=data['reason']
        )
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to reset attempts', 'details': str(e)}), 500


@attempts_reset_bp.route('/history', methods=['GET'])
@jwt_required_with_role()
def get_history(current_user):
    """Get attempt history"""
    student_id = request.args.get('student_id')
    quiz_id = request.args.get('quiz_id')

    if not student_id or not quiz_id:
        return jsonify({'error': 'student_id and quiz_id are required'}), 400

    # Check permissions
    if current_user.role.value == 'student' and current_user.id != student_id:
        return jsonify({'error': 'Access denied'}), 403

    history = AttemptResetService.get_attempt_history(student_id, quiz_id)
    return jsonify(history), 200


@attempts_reset_bp.route('/available', methods=['GET'])
@student_required
def get_available(current_user):
    """Get available attempts for current student"""
    quiz_id = request.args.get('quiz_id')

    if not quiz_id:
        return jsonify({'error': 'quiz_id is required'}), 400

    remaining = AttemptResetService.get_student_available_attempts(
        current_user.id,
        quiz_id
    )

    quiz = Quiz.query.get(quiz_id)
    if not quiz:
        return jsonify({'error': 'Quiz not found'}), 404

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
        "remaining_attempts": remaining,
        "max_attempts": quiz.max_attempts + additional_granted,
        "used_attempts": current_attempts,
        "additional_granted": additional_granted
    }), 200


@attempts_reset_bp.route('/quiz/<quiz_id>/reset', methods=['POST'])
@teacher_required
def reset_quiz_attempts(current_user, quiz_id):
    """Reset attempts for all students in a quiz"""
    data = request.get_json()

    required_fields = ['additional_attempts', 'reason']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400

    try:
        result = AttemptResetService.reset_quiz_attempts(
            quiz_id=quiz_id,
            additional_attempts=data['additional_attempts'],
            reset_by=current_user.id,
            reason=data['reason']
        )
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to reset quiz attempts', 'details': str(e)}), 500


@attempts_reset_bp.route('/quiz/<quiz_id>/categorized', methods=['GET'])
@teacher_required
def get_categorized_attempts(current_user, quiz_id):
    """Get attempts categorized by submission type"""
    categorized = AttemptResetService.separate_submissions_for_teacher(quiz_id)
    return jsonify(categorized), 200


@attempts_reset_bp.route('/summary', methods=['GET'])
@student_required
def get_attempt_summary(current_user):
    """Get comprehensive attempt summary for current student"""
    quiz_id = request.args.get('quiz_id')

    if not quiz_id:
        return jsonify({'error': 'quiz_id is required'}), 400

    summary = AttemptResetService.get_student_attempt_summary(
        current_user.id, quiz_id)

    if not summary:
        return jsonify({'error': 'Quiz not found'}), 404

    return jsonify(summary), 200
