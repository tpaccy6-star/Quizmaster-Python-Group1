from flask import Blueprint, request, jsonify
from app.utils.decorators import jwt_required_with_role, teacher_required, student_required
from app.models.quiz import Quiz, QuizStatus
from app.models.question import Question, QuestionType, Difficulty
from app.models.quiz_question import QuizQuestion
from app.models.class_model import Class
from app.services.notification_service import NotificationService
from app import db
import uuid

quiz_bp = Blueprint('quiz', __name__)


@quiz_bp.route('/', methods=['GET'])
@jwt_required_with_role()
def get_quizzes(current_user):
    """Get quizzes based on user role"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    status_filter = request.args.get('status')

    query = Quiz.query

    if current_user.role.value == 'teacher':
        query = query.filter_by(created_by=current_user.id)
    elif current_user.role.value == 'student':
        query = query.filter_by(status=QuizStatus.PUBLISHED)
        if current_user.student and current_user.student.class_id:
            query = query.filter(Quiz.classes.any(
                id=current_user.student.class_id))

    if status_filter:
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


@quiz_bp.route('/', methods=['POST'])
@teacher_required
def create_quiz(current_user):
    """Create a new quiz"""
    data = request.get_json()

    required_fields = ['title', 'subject', 'time_limit_minutes', 'class_ids']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400

    try:
        access_code = ''.join([str(uuid.uuid4().int)[:6].upper()])

        quiz = Quiz(
            title=data['title'],
            subject=data['subject'],
            description=data.get('description'),
            access_code=access_code,
            time_limit_minutes=data['time_limit_minutes'],
            created_by=current_user.id,
            passing_percentage=data.get('passing_percentage', 40),
            max_attempts=data.get('max_attempts', 1),
            show_answers_after_submission=data.get(
                'show_answers_after_submission', False),
            randomize_questions=data.get('randomize_questions', False),
            randomize_options=data.get('randomize_options', False),
            allow_review=data.get('allow_review', True)
        )

        db.session.add(quiz)
        db.session.flush()

        classes = Class.query.filter(Class.id.in_(data['class_ids'])).all()
        quiz.classes = classes

        db.session.commit()

        return jsonify({
            'message': 'Quiz created successfully',
            'quiz': quiz.to_dict(include_classes=True)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create quiz', 'details': str(e)}), 500


@quiz_bp.route('/<quiz_id>/publish', methods=['POST'])
@teacher_required
def publish_quiz(current_user, quiz_id):
    """Publish a quiz"""
    quiz = Quiz.query.get(quiz_id)

    if not quiz:
        return jsonify({'error': 'Quiz not found'}), 404

    if quiz.created_by != current_user.id:
        return jsonify({'error': 'Access denied'}), 403

    if quiz.status == QuizStatus.PUBLISHED:
        return jsonify({'error': 'Quiz is already published'}), 400

    if len(quiz.questions) == 0:
        return jsonify({'error': 'Quiz must have questions before publishing'}), 400

    quiz.status = QuizStatus.PUBLISHED
    db.session.commit()

    class_ids = [c.id for c in quiz.classes]
    NotificationService.notify_quiz_published(
        quiz_id=quiz.id,
        quiz_title=quiz.title,
        subject=quiz.subject,
        class_ids=class_ids
    )

    return jsonify({
        'message': 'Quiz published successfully',
        'quiz': quiz.to_dict(include_classes=True)
    }), 200
