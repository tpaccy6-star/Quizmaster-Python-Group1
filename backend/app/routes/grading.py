# Grading Controller
# Module Owner: Teacher Grading Specialist

# Handles HTTP requests for grading endpoints

from flask import Blueprint, request, jsonify
from app.utils.decorators import jwt_required_with_role, teacher_required
from app.services.grading_service import GradingService

grading_bp = Blueprint('grading', __name__)


@grading_bp.route('/pending', methods=['GET'])
@teacher_required
def get_pending_attempts(current_user):
    """Get pending attempts that need grading"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        result = GradingService.get_pending_attempts(
            teacher_id=current_user.id,
            page=page,
            per_page=per_page
        )

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': 'Failed to fetch pending attempts', 'details': str(e)}), 500


@grading_bp.route('/graded', methods=['GET'])
@teacher_required
def get_graded_attempts(current_user):
    """Get already graded attempts"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        result = GradingService.get_graded_attempts(
            teacher_id=current_user.id,
            page=page,
            per_page=per_page
        )

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': 'Failed to fetch graded attempts', 'details': str(e)}), 500


@grading_bp.route('/attempt/<attempt_id>', methods=['POST'])
@teacher_required
def grade_attempt(current_user, attempt_id):
    """Grade an attempt"""
    try:
        data = request.get_json()
        grades_data = data.get('grades', [])

        if not grades_data:
            return jsonify({'error': 'Grades data is required'}), 400

        result = GradingService.grade_attempt(
            attempt_id=attempt_id,
            teacher_id=current_user.id,
            grades_data=grades_data
        )

        return jsonify({
            'message': 'Attempt graded successfully',
            'attempt': result
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to grade attempt', 'details': str(e)}), 500


@grading_bp.route('/statistics', methods=['GET'])
@teacher_required
def get_grading_statistics(current_user):
    """Get grading statistics"""
    try:
        stats = GradingService.get_grading_statistics(current_user.id)

        return jsonify(stats), 200

    except Exception as e:
        return jsonify({'error': 'Failed to fetch statistics', 'details': str(e)}), 500
