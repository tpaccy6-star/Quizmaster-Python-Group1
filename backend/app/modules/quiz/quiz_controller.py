# Quiz Controller
# Module Owner: Student 5 - Question Bank Specialist

# Handles HTTP requests for quiz endpoints

from flask import Blueprint, request, jsonify
from app.utils.decorators import jwt_required_with_role, teacher_required, student_required
from app.modules.quiz.quiz_service import QuizService

quiz_bp = Blueprint('quiz', __name__)


@quiz_bp.route('/', methods=['GET'])
@jwt_required_with_role()
def get_quizzes(current_user):
    """Get quizzes based on user role"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        status_filter = request.args.get('status')

        from app.models.quiz import Quiz, QuizStatus
        from app.models.user import UserRole

        query = Quiz.query

        if current_user.role == UserRole.TEACHER:
            query = query.filter_by(created_by=current_user.id)
        elif current_user.role == UserRole.STUDENT:
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

    except Exception as e:
        return jsonify({'error': 'Failed to fetch quizzes', 'details': str(e)}), 500


@quiz_bp.route('/', methods=['POST'])
@teacher_required
def create_quiz(current_user):
    """Create a new quiz"""
    try:
        data = request.get_json()

        required_fields = ['title', 'subject',
                           'time_limit_minutes', 'class_ids']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400

        quiz = QuizService.create_quiz(
            teacher_id=current_user.id,
            quiz_data=data,
            class_ids=data['class_ids']
        )

        return jsonify({
            'message': 'Quiz created successfully',
            'quiz': quiz.to_dict(include_classes=True)
        }), 201

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to create quiz', 'details': str(e)}), 500


@quiz_bp.route('/<quiz_id>', methods=['GET'])
@jwt_required_with_role()
def get_quiz(current_user, quiz_id):
    """Get a specific quiz"""
    try:
        from app.models.quiz import Quiz
        from app.models.user import UserRole

        quiz = Quiz.query.get(quiz_id)

        if not quiz:
            return jsonify({'error': 'Quiz not found'}), 404

        # Check permissions
        if current_user.role == UserRole.TEACHER and quiz.created_by != current_user.id:
            return jsonify({'error': 'Access denied'}), 403
        elif current_user.role == UserRole.STUDENT:
            if quiz.status != QuizStatus.PUBLISHED:
                return jsonify({'error': 'Quiz not available'}), 403
            # Check if student is enrolled in assigned classes
            if current_user.student and current_user.student.class_id:
                if not any(c.id == current_user.student.class_id for c in quiz.classes):
                    return jsonify({'error': 'Not enrolled in this quiz'}), 403

        include_questions = request.args.get(
            'include_questions', 'false').lower() == 'true'

        return jsonify({
            'quiz': quiz.to_dict(include_questions=include_questions, include_classes=True)
        }), 200

    except Exception as e:
        return jsonify({'error': 'Failed to fetch quiz', 'details': str(e)}), 500


@quiz_bp.route('/<quiz_id>', methods=['PUT'])
@teacher_required
def update_quiz(current_user, quiz_id):
    """Update a quiz"""
    try:
        data = request.get_json()

        quiz = QuizService.update_quiz(quiz_id, current_user.id, data)

        return jsonify({
            'message': 'Quiz updated successfully',
            'quiz': quiz.to_dict(include_classes=True)
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to update quiz', 'details': str(e)}), 500


@quiz_bp.route('/<quiz_id>/publish', methods=['POST'])
@teacher_required
def publish_quiz(current_user, quiz_id):
    """Publish a quiz"""
    try:
        quiz = QuizService.publish_quiz(quiz_id, current_user.id)

        return jsonify({
            'message': 'Quiz published successfully',
            'quiz': quiz.to_dict(include_classes=True)
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to publish quiz', 'details': str(e)}), 500


@quiz_bp.route('/<quiz_id>/questions', methods=['POST'])
@teacher_required
def add_question_to_quiz(current_user, quiz_id):
    """Add a question to a quiz"""
    try:
        data = request.get_json()

        question = QuizService.add_question_to_quiz(
            quiz_id, current_user.id, data)

        return jsonify({
            'message': 'Question added successfully',
            'question': question.to_dict()
        }), 201

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to add question', 'details': str(e)}), 500


@quiz_bp.route('/<quiz_id>/questions/<question_id>', methods=['DELETE'])
@teacher_required
def remove_question_from_quiz(current_user, quiz_id, question_id):
    """Remove a question from a quiz"""
    try:
        QuizService.remove_question_from_quiz(
            quiz_id, current_user.id, question_id)

        return jsonify({'message': 'Question removed successfully'}), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to remove question', 'details': str(e)}), 500


@quiz_bp.route('/questions', methods=['GET'])
@teacher_required
def get_question_bank(current_user):
    """Get teacher's question bank"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        question_type = request.args.get('type')
        topic = request.args.get('topic')
        difficulty = request.args.get('difficulty')

        result = QuizService.get_question_bank(
            teacher_id=current_user.id,
            page=page,
            per_page=per_page,
            question_type=question_type,
            topic=topic,
            difficulty=difficulty
        )

        return jsonify(result), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to fetch question bank', 'details': str(e)}), 500


@quiz_bp.route('/questions', methods=['POST'])
@teacher_required
def create_question(current_user):
    """Create a new question in the question bank"""
    try:
        data = request.get_json()

        question = QuizService.create_question(current_user.id, data)

        return jsonify({
            'message': 'Question created successfully',
            'question': question.to_dict()
        }), 201

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to create question', 'details': str(e)}), 500


@quiz_bp.route('/access-code/<access_code>', methods=['GET'])
@jwt_required_with_role()
def get_quiz_by_access_code(current_user, access_code):
    """Get quiz by access code"""
    try:
        quiz = QuizService.get_quiz_by_access_code(access_code)

        include_questions = request.args.get(
            'include_questions', 'false').lower() == 'true'

        return jsonify({
            'quiz': quiz.to_dict(include_questions=include_questions, include_classes=True)
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': 'Failed to fetch quiz', 'details': str(e)}), 500
