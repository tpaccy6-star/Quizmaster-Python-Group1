# Student Controller
# Module Owner: Student 4 - Student Experience Specialist

# Handles HTTP requests for student endpoints

from flask import Blueprint, request, jsonify
from app.utils.decorators import student_required
from app.modules.student.student_service import StudentService

student_bp = Blueprint('student', __name__)


@student_bp.route('/dashboard', methods=['GET'])
@student_required
def get_dashboard(current_user):
    """Get student dashboard data"""
    try:
        dashboard_data = StudentService.get_student_dashboard(current_user.id)
        return jsonify(dashboard_data), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': 'Failed to fetch dashboard', 'details': str(e)}), 500


@student_bp.route('/quizzes', methods=['GET'])
@student_required
def get_available_quizzes(current_user):
    """Get quizzes available to the student"""
    try:
        result = StudentService.get_available_quizzes(current_user.id)
        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': 'Failed to fetch quizzes', 'details': str(e)}), 500


@student_bp.route('/results', methods=['GET'])
@student_required
def get_student_results(current_user):
    """Get student's quiz results"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)

        result = StudentService.get_student_results(
            student_id=current_user.id,
            page=page,
            per_page=per_page
        )

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': 'Failed to fetch results', 'details': str(e)}), 500


@student_bp.route('/quiz/<quiz_id>/start', methods=['POST'])
@student_required
def start_quiz(current_user, quiz_id):
    """Start a new quiz attempt"""
    try:
        attempt = StudentService.start_quiz_attempt(current_user.id, quiz_id)
        return jsonify({
            'message': 'Quiz attempt started',
            'attempt': attempt,
            'attempt_id': attempt.get('id')
        }), 201

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to start quiz', 'details': str(e)}), 500


@student_bp.route('/attempt/<attempt_id>/answer', methods=['POST'])
@student_required
def submit_answer(current_user, attempt_id):
    """Submit or update an answer in a quiz attempt"""
    try:
        data = request.get_json()

        if not data.get('question_id'):
            return jsonify({'error': 'question_id is required'}), 400

        if 'answer' not in data:
            return jsonify({'error': 'answer is required'}), 400

        answer = StudentService.submit_answer(
            student_id=current_user.id,
            attempt_id=attempt_id,
            question_id=data['question_id'],
            answer_data=data['answer']
        )

        return jsonify({
            'message': 'Answer submitted',
            'answer': answer
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to submit answer', 'details': str(e)}), 500


@student_bp.route('/attempt/<attempt_id>/submit', methods=['POST'])
@student_required
def submit_quiz(current_user, attempt_id):
    """Submit a completed quiz attempt"""
    try:
        attempt = StudentService.submit_quiz_attempt(
            current_user.id, attempt_id)
        return jsonify({
            'message': 'Quiz submitted successfully',
            'attempt': attempt
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to submit quiz', 'details': str(e)}), 500


@student_bp.route('/profile', methods=['PUT'])
@student_required
def update_profile(current_user):
    """Update student profile"""
    try:
        data = request.get_json()

        student = StudentService.update_student_profile(
            student_id=current_user.id,
            profile_data=data
        )

        return jsonify({
            'message': 'Profile updated successfully',
            'student': student
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to update profile', 'details': str(e)}), 500
