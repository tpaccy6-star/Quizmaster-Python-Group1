from flask import Blueprint, request, jsonify
from app.utils.decorators import teacher_required
from app.models.quiz import Quiz, generate_access_code
from app.models.student import Student
from app.models.class_model import Class
from app.models.quiz_attempt import QuizAttempt, AttemptStatus
from app.models.teacher import Teacher
from app.services.notification_service import NotificationService
from app import db

teacher_bp = Blueprint('teacher', __name__)


@teacher_bp.route('/dashboard', methods=['GET'])
@teacher_required
def get_dashboard(current_user):
    """Get teacher dashboard data"""
    teacher = Teacher.query.get(current_user.id)

    # Get teacher's classes
    classes = teacher.classes

    # Get teacher's quizzes
    quizzes = Quiz.query.filter_by(created_by=current_user.id).all()

    # Get recent attempts
    recent_attempts = []
    for quiz in quizzes:
        attempts = QuizAttempt.query.filter_by(quiz_id=quiz.id).order_by(
            QuizAttempt.started_at.desc()
        ).limit(5).all()
        recent_attempts.extend([a.to_dict() for a in attempts])

    # Sort by start date
    recent_attempts.sort(key=lambda x: x['started_at'], reverse=True)
    recent_attempts = recent_attempts[:10]

    return jsonify({
        'teacher': teacher.to_dict(include_user=False),
        'classes': [c.to_dict() for c in classes],
        'quizzes': [q.to_dict() for q in quizzes],
        'recent_attempts': recent_attempts,
        'stats': {
            'total_quizzes': len(quizzes),
            'total_classes': len(classes),
            'total_students': sum(len(c.students) for c in classes),
            'published_quizzes': len([q for q in quizzes if q.status.value == 'published'])
        }
    }), 200


@teacher_bp.route('/classes', methods=['GET'])
@teacher_required
def get_teacher_classes(current_user):
    """Get classes assigned to teacher"""
    teacher = Teacher.query.get(current_user.id)
    classes = teacher.classes

    return jsonify({
        'classes': [c.to_dict() for c in classes]
    }), 200


@teacher_bp.route('/students', methods=['GET'])
@teacher_required
def get_teacher_students(current_user):
    """Get students in teacher's classes"""
    teacher = Teacher.query.get(current_user.id)

    # Get all students from teacher's classes
    students = []
    for class_obj in teacher.classes:
        students.extend(class_obj.students)

    # Remove duplicates and sort
    unique_students = list({s.id: s for s in students}.values())

    return jsonify({
        'students': [s.to_dict() for s in unique_students]
    }), 200


@teacher_bp.route('/quizzes', methods=['GET'])
@teacher_required
def get_teacher_quizzes(current_user):
    """Get teacher's quizzes"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    status_filter = request.args.get('status')

    query = Quiz.query.filter_by(created_by=current_user.id)

    if status_filter:
        from app.models.quiz import QuizStatus
        try:
            status = QuizStatus(status_filter)
            query = query.filter_by(status=status)
        except ValueError:
            return jsonify({'error': 'Invalid status'}), 400

    quizzes = query.order_by(Quiz.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        'quizzes': [q.to_dict(include_classes=True) for q in quizzes.items],
        'total': quizzes.total,
        'pages': quizzes.pages,
        'current_page': page
    }), 200


@teacher_bp.route('/grading/pending', methods=['GET'])
@teacher_required
def get_pending_grading(current_user):
    """Get quiz attempts that need manual grading"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    # Get attempts from teacher's quizzes that need grading
    pending_attempts = db.session.query(QuizAttempt).join(Quiz).filter(
        Quiz.created_by == current_user.id,
        QuizAttempt.status == AttemptStatus.SUBMITTED
    ).order_by(QuizAttempt.submitted_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    attempts_data = []
    for attempt in pending_attempts.items:
        data = attempt.to_dict(include_answers=True)
        data['quiz'] = attempt.quiz.to_dict()
        data['student'] = attempt.student.to_dict() if attempt.student else None
        attempts_data.append(data)

    return jsonify({
        'attempts': attempts_data,
        'total': pending_attempts.total,
        'pages': pending_attempts.pages,
        'current_page': page
    }), 200


@teacher_bp.route('/quizzes/<quiz_id>/access-code', methods=['POST'])
@teacher_required
def regenerate_access_code(current_user, quiz_id):
    """Regenerate a quiz access code and notify assigned students."""
    quiz = Quiz.query.get(quiz_id)

    if not quiz:
        return jsonify({'error': 'Quiz not found'}), 404

    if quiz.created_by != current_user.id:
        return jsonify({'error': 'Access denied'}), 403

    # Generate a unique code with a few retries
    new_code = None
    for _ in range(10):
        candidate = generate_access_code()
        if not Quiz.query.filter_by(access_code=candidate).first():
            new_code = candidate
            break

    if not new_code:
        return jsonify({'error': 'Failed to generate unique access code'}), 500

    quiz.access_code = new_code

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update access code', 'details': str(e)}), 500

    class_ids = [c.id for c in quiz.classes]
    NotificationService.notify_quiz_access_code(
        quiz_title=quiz.title,
        access_code=new_code,
        class_ids=class_ids
    )

    return jsonify({
        'message': 'New access code generated successfully',
        'access_code': new_code,
        'quiz': quiz.to_dict(include_classes=True)
    }), 200
