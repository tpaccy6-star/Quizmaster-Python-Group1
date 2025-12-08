from flask import Blueprint, request, jsonify
from app.utils.decorators import admin_required
from app.models.user import User, UserRole
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.class_model import Class
from app import db

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/users', methods=['GET'])
@admin_required
def get_users(current_user):
    """Get all users with pagination and filtering"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    role_filter = request.args.get('role')
    search = request.args.get('search')

    query = User.query

    if role_filter:
        try:
            role = UserRole(role_filter)
            query = query.filter_by(role=role)
        except ValueError:
            return jsonify({'error': 'Invalid role'}), 400

    if search:
        query = query.filter(
            (User.name.ilike(f'%{search}%')) |
            (User.email.ilike(f'%{search}%'))
        )

    users = query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    user_data = []
    for user in users.items:
        data = user.to_dict()
        if user.role == UserRole.TEACHER and user.teacher:
            data.update(user.teacher.to_dict(include_user=False))
        elif user.role == UserRole.STUDENT and user.student:
            data.update(user.student.to_dict(include_user=False))
        user_data.append(data)

    return jsonify({
        'users': user_data,
        'total': users.total,
        'pages': users.pages,
        'current_page': page
    }), 200


@admin_bp.route('/users/<user_id>', methods=['GET'])
@admin_required
def get_user(current_user, user_id):
    """Get a specific user"""
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    user_data = user.to_dict()
    if user.role == UserRole.TEACHER and user.teacher:
        user_data.update(user.teacher.to_dict(include_user=False))
    elif user.role == UserRole.STUDENT and user.student:
        user_data.update(user.student.to_dict(include_user=False))

    return jsonify({'user': user_data}), 200


@admin_bp.route('/users/<user_id>/toggle-active', methods=['POST'])
@admin_required
def toggle_user_active(current_user, user_id):
    """Toggle user active status"""
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    if user.id == current_user.id:
        return jsonify({'error': 'Cannot deactivate your own account'}), 400

    user.is_active = not user.is_active
    db.session.commit()

    status = 'activated' if user.is_active else 'deactivated'
    return jsonify({
        'message': f'User {status} successfully',
        'user': user.to_dict()
    }), 200


@admin_bp.route('/classes', methods=['GET'])
@admin_required
def get_classes(current_user):
    """Get all classes"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search')

    query = Class.query

    if search:
        query = query.filter(
            (Class.name.ilike(f'%{search}%')) |
            (Class.section.ilike(f'%{search}%'))
        )

    classes = query.order_by(Class.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        'classes': [c.to_dict() for c in classes.items],
        'total': classes.total,
        'pages': classes.pages,
        'current_page': page
    }), 200


@admin_bp.route('/classes', methods=['POST'])
@admin_required
def create_class(current_user):
    """Create a new class"""
    data = request.get_json()

    if not data.get('name'):
        return jsonify({'error': 'Class name is required'}), 400

    try:
        class_obj = Class(
            name=data['name'],
            section=data.get('section'),
            academic_year=data.get('academic_year'),
            created_by=current_user.id
        )

        db.session.add(class_obj)
        db.session.commit()

        return jsonify({
            'message': 'Class created successfully',
            'class': class_obj.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create class', 'details': str(e)}), 500


@admin_bp.route('/dashboard/stats', methods=['GET'])
@admin_required
def get_dashboard_stats(current_user):
    """Get admin dashboard statistics"""
    total_users = User.query.count()
    total_teachers = Teacher.query.count()
    total_students = Student.query.count()
    total_classes = Class.query.count()

    active_users = User.query.filter_by(is_active=True).count()
    inactive_users = total_users - active_users

    # User counts by role
    admin_count = User.query.filter_by(role=UserRole.ADMIN).count()
    teacher_count = User.query.filter_by(role=UserRole.TEACHER).count()
    student_count = User.query.filter_by(role=UserRole.STUDENT).count()

    return jsonify({
        'total_users': total_users,
        'active_users': active_users,
        'inactive_users': inactive_users,
        'admin_count': admin_count,
        'teacher_count': teacher_count,
        'student_count': student_count,
        'total_classes': total_classes
    }), 200
