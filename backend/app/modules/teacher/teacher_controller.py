# Teacher Controller
# Module Owner: Student 3 - Quiz Management Specialist

# Handles HTTP requests for teacher endpoints

from flask import Blueprint, request, jsonify
from app.utils.decorators import teacher_required
from app.modules.teacher.teacher_service import TeacherService

teacher_bp = Blueprint('teacher', __name__)


@teacher_bp.route('/dashboard', methods=['GET'])
@teacher_required
def get_dashboard(current_user):
    """Get teacher dashboard data"""
    try:
        dashboard_data = TeacherService.get_teacher_dashboard(current_user.id)
        return jsonify(dashboard_data), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': 'Failed to fetch dashboard', 'details': str(e)}), 500


@teacher_bp.route('/classes', methods=['GET'])
@teacher_required
def get_teacher_classes(current_user):
    """Get classes assigned to teacher"""
    try:
        classes = TeacherService.get_teacher_classes(current_user.id)
        return jsonify({'classes': classes}), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': 'Failed to fetch classes', 'details': str(e)}), 500


@teacher_bp.route('/students', methods=['GET'])
@teacher_required
def get_teacher_students(current_user):
    """Get students in teacher's classes"""
    try:
        students = TeacherService.get_teacher_students(current_user.id)
        return jsonify({'students': students}), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': 'Failed to fetch students', 'details': str(e)}), 500


@teacher_bp.route('/grading/pending', methods=['GET'])
@teacher_required
def get_pending_grading(current_user):
    """Get quiz attempts that need manual grading"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        result = TeacherService.get_pending_grading(
            teacher_id=current_user.id,
            page=page,
            per_page=per_page
        )

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': 'Failed to fetch pending grading', 'details': str(e)}), 500


@teacher_bp.route('/grade-answer', methods=['POST'])
@teacher_required
def grade_answer(current_user):
    """Grade a student's answer"""
    try:
        data = request.get_json()

        required_fields = ['attempt_id', 'question_id', 'marks_awarded']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400

        answer = TeacherService.grade_student_answer(
            attempt_id=data['attempt_id'],
            question_id=data['question_id'],
            marks_awarded=data['marks_awarded'],
            feedback=data.get('feedback', ''),
            teacher_id=current_user.id
        )

        return jsonify({
            'message': 'Answer graded successfully',
            'answer': answer
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to grade answer', 'details': str(e)}), 500


@teacher_bp.route('/classes/<class_id>/assign', methods=['POST'])
@teacher_required
def assign_to_class(current_user, class_id):
    """Assign teacher to a class"""
    try:
        TeacherService.assign_teacher_to_class(current_user.id, class_id)
        return jsonify({'message': 'Assigned to class successfully'}), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to assign to class', 'details': str(e)}), 500


@teacher_bp.route('/classes/<class_id>/remove', methods=['POST'])
@teacher_required
def remove_from_class(current_user, class_id):
    """Remove teacher from a class"""
    try:
        TeacherService.remove_teacher_from_class(current_user.id, class_id)
        return jsonify({'message': 'Removed from class successfully'}), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to remove from class', 'details': str(e)}), 500
