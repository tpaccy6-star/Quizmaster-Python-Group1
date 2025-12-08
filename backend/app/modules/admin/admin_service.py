# Admin Service
# Module Owner: Student 2 - System Administrator

# Handles all administrative business logic

from datetime import datetime
from app import db
from app.models.user import User, UserRole
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.class_model import Class
from app.models.audit_log import AuditLog


class AdminService:

    @staticmethod
    def get_all_users(page=1, per_page=20, role_filter=None, search=None):
        """Get all users with filtering and pagination"""
        query = User.query

        if role_filter:
            try:
                role = UserRole(role_filter)
                query = query.filter_by(role=role)
            except ValueError:
                raise ValueError('Invalid role')

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

        return {
            'users': user_data,
            'total': users.total,
            'pages': users.pages,
            'current_page': page
        }

    @staticmethod
    def get_user_by_id(user_id):
        """Get specific user by ID"""
        user = User.query.get(user_id)

        if not user:
            raise ValueError('User not found')

        user_data = user.to_dict()
        if user.role == UserRole.TEACHER and user.teacher:
            user_data.update(user.teacher.to_dict(include_user=False))
        elif user.role == UserRole.STUDENT and user.student:
            user_data.update(user.student.to_dict(include_user=False))

        return user_data

    @staticmethod
    def toggle_user_status(user_id, admin_id):
        """Toggle user active/inactive status"""
        user = User.query.get(user_id)

        if not user:
            raise ValueError('User not found')

        if user.id == admin_id:
            raise ValueError('Cannot deactivate your own account')

        old_status = user.is_active
        user.is_active = not user.is_active

        # Log the action
        audit_log = AuditLog(
            user_id=admin_id,
            action='toggle_user_status',
            entity_type='user',
            entity_id=user_id,
            old_value={'is_active': old_status},
            new_value={'is_active': user.is_active}
        )
        db.session.add(audit_log)
        db.session.commit()

        return user

    @staticmethod
    def update_user(user_id, data):
        """Update user information"""
        user = User.query.get(user_id)

        if not user:
            raise ValueError('User not found')

        # Update allowed fields
        if 'name' in data:
            user.name = data['name']

        if 'email' in data:
            # Check if email already exists for another user
            existing_user = User.query.filter_by(email=data['email']).first()
            if existing_user and existing_user.id != user_id:
                raise ValueError('Email already exists')
            user.email = data['email']

        db.session.commit()
        return user.to_dict()

    @staticmethod
    def get_all_classes(page=1, per_page=20, search=None):
        """Get all classes with pagination"""
        query = Class.query

        if search:
            query = query.filter(
                (Class.name.ilike(f'%{search}%')) |
                (Class.section.ilike(f'%{search}%'))
            )

        classes = query.order_by(Class.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return {
            'classes': [c.to_dict() for c in classes.items],
            'total': classes.total,
            'pages': classes.pages,
            'current_page': page
        }

    @staticmethod
    def create_class(name, section, academic_year, admin_id):
        """Create a new class"""
        # Check if class already exists
        existing = Class.query.filter_by(
            name=name,
            section=section,
            academic_year=academic_year
        ).first()

        if existing:
            raise ValueError('Class with these details already exists')

        class_obj = Class(
            name=name,
            section=section,
            academic_year=academic_year,
            created_by=admin_id
        )

        db.session.add(class_obj)

        # Log the action
        audit_log = AuditLog(
            user_id=admin_id,
            action='create_class',
            entity_type='class',
            entity_id=class_obj.id,
            new_value={'name': name, 'section': section,
                       'academic_year': academic_year}
        )
        db.session.add(audit_log)
        db.session.commit()

        return class_obj

    @staticmethod
    def assign_teacher_to_class(class_id, teacher_id):
        """Assign teacher to a class"""
        class_obj = Class.query.get(class_id)
        if not class_obj:
            raise ValueError('Class not found')

        teacher = Teacher.query.get(teacher_id)
        if not teacher:
            raise ValueError('Teacher not found')

        # Check if teacher is already assigned
        if teacher in class_obj.teachers:
            raise ValueError('Teacher already assigned to this class')

        # Add teacher to class (many-to-many relationship)
        class_obj.teachers.append(teacher)
        db.session.commit()

        return class_obj.to_dict()

    @staticmethod
    def assign_student_to_class(class_id, student_id):
        """Assign student to a class"""
        class_obj = Class.query.get(class_id)
        if not class_obj:
            raise ValueError('Class not found')

        student = Student.query.get(student_id)
        if not student:
            raise ValueError('Student not found')

        # Check if student is already assigned
        if student.class_id == class_id:
            raise ValueError('Student already assigned to this class')

        old_class_id = student.class_id
        student.class_id = class_id
        db.session.commit()

        return class_obj.to_dict()

    @staticmethod
    def get_dashboard_stats():
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

        return {
            'total_users': total_users,
            'active_users': active_users,
            'inactive_users': inactive_users,
            'admin_count': admin_count,
            'teacher_count': teacher_count,
            'student_count': student_count,
            'total_classes': total_classes
        }

    @staticmethod
    def get_audit_logs(page=1, per_page=50, user_id=None, action=None):
        """Get audit logs with filtering"""
        query = AuditLog.query

        if user_id:
            query = query.filter_by(user_id=user_id)

        if action:
            query = query.filter(AuditLog.action.ilike(f'%{action}%'))

        logs = query.order_by(AuditLog.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return {
            'logs': [log.to_dict() for log in logs.items],
            'total': logs.total,
            'pages': logs.pages,
            'current_page': page
        }
