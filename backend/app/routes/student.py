from flask import Blueprint, request, jsonify
from app.utils.decorators import student_required
from app.models.quiz import Quiz, QuizStatus
from app.models.quiz_attempt import QuizAttempt, AttemptStatus
from app.models.student import Student
from app.models.class_model import Class
from app.services.attempt_reset_service import AttemptResetService
from app import db

student_bp = Blueprint('student', __name__)


@student_bp.route('/dashboard', methods=['GET'])
@student_required
def get_dashboard(current_user):
    """Get student dashboard data"""
    student = Student.query.get(current_user.id)

    # Get available quizzes
    available_quizzes = []
    if student.class_:
        for class_obj in student.class_:
            for quiz in class_obj.quizzes:
                if quiz.status == QuizStatus.PUBLISHED:
                    # Check if student has attempts left
                    remaining = AttemptResetService.get_student_available_attempts(
                        current_user.id, quiz.id
                    )
                    if remaining > 0:
                        quiz_data = quiz.to_dict()
                        quiz_data['remaining_attempts'] = remaining
                        available_quizzes.append(quiz_data)

    # Get recent attempts
    recent_attempts = QuizAttempt.query.filter_by(
        student_id=current_user.id
    ).order_by(QuizAttempt.started_at.desc()).limit(10).all()

    return jsonify({
        'student': student.to_dict(include_user=False),
        'class': student.class_.to_dict() if student.class_ else None,
        'available_quizzes': available_quizzes,
        'recent_attempts': [a.to_dict() for a in recent_attempts],
        'stats': {
            'total_attempts': QuizAttempt.query.filter_by(student_id=current_user.id).count(),
            'completed_attempts': QuizAttempt.query.filter_by(
                student_id=current_user.id,
                status=AttemptStatus.SUBMITTED
            ).count(),
            'available_quizzes': len(available_quizzes)
        }
    }), 200


@student_bp.route('/quizzes', methods=['GET'])
@student_required
def get_available_quizzes(current_user):
    """Get quizzes available to the student"""
    student = Student.query.get(current_user.id)

    if not student.class_:
        return jsonify({'quizzes': []}), 200

    # Get published quizzes assigned to student's class
    quizzes = Quiz.query.filter_by(status=QuizStatus.PUBLISHED).filter(
        Quiz.classes.any(id=student.class_id)
    ).all()

    quiz_data = []
    for quiz in quizzes:
        remaining = AttemptResetService.get_student_available_attempts(
            current_user.id, quiz.id
        )

        quiz_info = quiz.to_dict()
        quiz_info['remaining_attempts'] = remaining
        quiz_info['can_attempt'] = remaining > 0

        # Get latest attempt info
        latest_attempt = QuizAttempt.query.filter_by(
            student_id=current_user.id,
            quiz_id=quiz.id
        ).order_by(QuizAttempt.started_at.desc()).first()

        if latest_attempt:
            quiz_info['latest_attempt'] = latest_attempt.to_dict()

        quiz_data.append(quiz_info)

    return jsonify({'quizzes': quiz_data}), 200


@student_bp.route('/results', methods=['GET'])
@student_required
def get_student_results(current_user):
    """Get student's quiz results"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)

    attempts = QuizAttempt.query.filter_by(
        student_id=current_user.id
    ).filter(
        QuizAttempt.status.in_([AttemptStatus.SUBMITTED, AttemptStatus.GRADED])
    ).order_by(QuizAttempt.submitted_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    results = []
    for attempt in attempts.items:
        data = attempt.to_dict(include_answers=True)
        data['quiz'] = attempt.quiz.to_dict()
        results.append(data)

    return jsonify({
        'results': results,
        'total': attempts.total,
        'pages': attempts.pages,
        'current_page': page
    }), 200


@student_bp.route('/profile', methods=['PUT'])
@student_required
def update_profile(current_user):
    """Update student profile"""
    student = Student.query.get(current_user.id)
    data = request.get_json()

    # Update student-specific fields
    updatable_fields = ['parent_email', 'parent_phone']
    for field in updatable_fields:
        if field in data:
            setattr(student, field, data[field])

    # Update user fields
    user_fields = ['name']
    for field in user_fields:
        if field in data:
            setattr(current_user, field, data[field])

    try:
        db.session.commit()
        return jsonify({
            'message': 'Profile updated successfully',
            'student': student.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update profile', 'details': str(e)}), 500
