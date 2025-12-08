# Admin Controller
# Module Owner: Student 2 - System Administrator

# Handles HTTP requests for admin endpoints

from flask import Blueprint, request, jsonify
from app.utils.decorators import admin_required
from app.modules.admin.admin_service import AdminService

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/users', methods=['GET'])
@admin_required
def get_users(current_user):
    """Get all users with pagination and filtering"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        role_filter = request.args.get('role')
        search = request.args.get('search')

        result = AdminService.get_all_users(
            page=page,
            per_page=per_page,
            role_filter=role_filter,
            search=search
        )

        return jsonify(result), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to fetch users', 'details': str(e)}), 500


@admin_bp.route('/users/<user_id>', methods=['GET'])
@admin_required
def get_user(current_user, user_id):
    """Get a specific user"""
    try:
        user_data = AdminService.get_user_by_id(user_id)
        return jsonify({'user': user_data}), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': 'Failed to fetch user', 'details': str(e)}), 500


@admin_bp.route('/users/<user_id>', methods=['PUT'])
@admin_required
def update_user(current_user, user_id):
    """Update user information"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        user_data = AdminService.update_user(user_id, data)
        return jsonify({
            'message': 'User updated successfully',
            'user': user_data
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to update user', 'details': str(e)}), 500


@admin_bp.route('/users/<user_id>/toggle-active', methods=['POST'])
@admin_required
def toggle_user_active(current_user, user_id):
    """Toggle user active status"""
    try:
        user = AdminService.toggle_user_status(user_id, current_user.id)

        status = 'activated' if user.is_active else 'deactivated'
        return jsonify({
            'message': f'User {status} successfully',
            'user': user.to_dict()
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to toggle user status', 'details': str(e)}), 500


@admin_bp.route('/classes', methods=['GET'])
@admin_required
def get_classes(current_user):
    """Get all classes"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search')

        result = AdminService.get_all_classes(
            page=page,
            per_page=per_page,
            search=search
        )

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': 'Failed to fetch classes', 'details': str(e)}), 500


@admin_bp.route('/classes', methods=['POST'])
@admin_required
def create_class(current_user):
    """Create a new class"""
    try:
        data = request.get_json()

        if not data.get('name'):
            return jsonify({'error': 'Class name is required'}), 400

        class_obj = AdminService.create_class(
            name=data['name'],
            section=data.get('section'),
            academic_year=data.get('academic_year'),
            admin_id=current_user.id
        )

        return jsonify({
            'message': 'Class created successfully',
            'class': class_obj.to_dict()
        }), 201

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to create class', 'details': str(e)}), 500


@admin_bp.route('/classes/<class_id>/assign-teacher', methods=['POST'])
@admin_required
def assign_teacher_to_class(current_user, class_id):
    """Assign teacher to a class"""
    try:
        data = request.get_json()
        teacher_id = data.get('teacher_id')

        if not teacher_id:
            return jsonify({'error': 'Teacher ID is required'}), 400

        result = AdminService.assign_teacher_to_class(class_id, teacher_id)
        return jsonify({
            'message': 'Teacher assigned successfully',
            'class': result
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to assign teacher', 'details': str(e)}), 500


@admin_bp.route('/classes/<class_id>/assign-student', methods=['POST'])
@admin_required
def assign_student_to_class(current_user, class_id):
    """Assign student to a class"""
    try:
        data = request.get_json()
        student_id = data.get('student_id')

        if not student_id:
            return jsonify({'error': 'Student ID is required'}), 400

        result = AdminService.assign_student_to_class(class_id, student_id)
        return jsonify({
            'message': 'Student assigned successfully',
            'class': result
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to assign student', 'details': str(e)}), 500


@admin_bp.route('/dashboard/stats', methods=['GET'])
@admin_required
def get_dashboard_stats(current_user):
    """Get admin dashboard statistics"""
    try:
        stats = AdminService.get_dashboard_stats()
        return jsonify(stats), 200

    except Exception as e:
        return jsonify({'error': 'Failed to fetch dashboard stats', 'details': str(e)}), 500


@admin_bp.route('/audit-logs', methods=['GET'])
@admin_required
def get_audit_logs(current_user):
    """Get audit logs with filtering"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        user_id = request.args.get('user_id')
        action = request.args.get('action')

        result = AdminService.get_audit_logs(
            page=page,
            per_page=per_page,
            user_id=user_id,
            action=action
        )

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': 'Failed to fetch audit logs', 'details': str(e)}), 500
