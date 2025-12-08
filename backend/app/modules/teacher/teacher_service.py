# Teacher Service
# Module Owner: Student 3 - Quiz Management Specialist

# Handles all teacher-related business logic

from datetime import datetime
from app import db
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.class_model import Class
from app.models.quiz import Quiz, QuizStatus
from app.models.quiz_attempt import QuizAttempt, AttemptStatus
from app.models.student_answer import StudentAnswer


class TeacherService:

    @staticmethod
    def get_teacher_dashboard(teacher_id):
        """Get teacher dashboard data"""
        teacher = Teacher.query.get(teacher_id)

        if not teacher:
            raise ValueError('Teacher not found')

        # Get teacher's classes
        classes = teacher.classes

        # Get teacher's quizzes
        quizzes = Quiz.query.filter_by(created_by=teacher_id).all()

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

        return {
            'teacher': teacher.to_dict(include_user=False),
            'classes': [c.to_dict() for c in classes],
            'quizzes': [q.to_dict() for q in quizzes],
            'recent_attempts': recent_attempts,
            'stats': {
                'total_quizzes': len(quizzes),
                'total_classes': len(classes),
                'total_students': sum(len(c.students) for c in classes),
                'published_quizzes': len([q for q in quizzes if q.status == QuizStatus.PUBLISHED])
            }
        }

    @staticmethod
    def get_teacher_classes(teacher_id):
        """Get classes assigned to teacher"""
        teacher = Teacher.query.get(teacher_id)

        if not teacher:
            raise ValueError('Teacher not found')

        return [c.to_dict() for c in teacher.classes]

    @staticmethod
    def get_teacher_students(teacher_id):
        """Get students in teacher's classes"""
        teacher = Teacher.query.get(teacher_id)

        if not teacher:
            raise ValueError('Teacher not found')

        # Get all students from teacher's classes
        students = []
        for class_obj in teacher.classes:
            students.extend(class_obj.students)

        # Remove duplicates and sort
        unique_students = list({s.id: s for s in students}.values())

        return [s.to_dict() for s in unique_students]

    @staticmethod
    def get_teacher_quizzes(teacher_id, page=1, per_page=10, status_filter=None):
        """Get teacher's quizzes with pagination"""
        query = Quiz.query.filter_by(created_by=teacher_id)

        if status_filter:
            try:
                status = QuizStatus(status_filter)
                query = query.filter_by(status=status)
            except ValueError:
                raise ValueError('Invalid status')

        quizzes = query.order_by(Quiz.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return {
            'quizzes': [q.to_dict(include_classes=True) for q in quizzes.items],
            'total': quizzes.total,
            'pages': quizzes.pages,
            'current_page': page
        }

    @staticmethod
    def get_pending_grading(teacher_id, page=1, per_page=20):
        """Get quiz attempts that need manual grading"""
        # Get attempts from teacher's quizzes that need grading
        pending_attempts = db.session.query(QuizAttempt).join(Quiz).filter(
            Quiz.created_by == teacher_id,
            QuizAttempt.status == AttemptStatus.SUBMITTED
        ).order_by(QuizAttempt.submitted_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        attempts_data = []
        for attempt in pending_attempts.items:
            data = attempt.to_dict(include_answers=True)
            data['quiz'] = attempt.quiz.to_dict()
            data['student'] = attempt.student.to_dict(
            ) if attempt.student else None
            attempts_data.append(data)

        return {
            'attempts': attempts_data,
            'total': pending_attempts.total,
            'pages': pending_attempts.pages,
            'current_page': page
        }

    @staticmethod
    def grade_student_answer(attempt_id, question_id, marks_awarded, feedback, teacher_id):
        """Grade a student's answer"""
        answer = StudentAnswer.query.filter_by(
            attempt_id=attempt_id,
            question_id=question_id
        ).first()

        if not answer:
            raise ValueError('Answer not found')

        # Verify teacher owns the quiz
        quiz = answer.attempt.quiz
        if quiz.created_by != teacher_id:
            raise ValueError('Unauthorized to grade this answer')

        answer.marks_awarded = marks_awarded
        answer.feedback = feedback
        answer.graded_by = teacher_id
        answer.graded_at = datetime.utcnow()
        answer.is_final = True

        # Update attempt score
        attempt = answer.attempt
        total_marks = sum(
            ans.marks_awarded or 0 for ans in attempt.answers
            if ans.marks_awarded is not None
        )
        attempt.score = total_marks
        attempt.percentage = (
            total_marks / attempt.total_marks * 100) if attempt.total_marks > 0 else 0
        attempt.passed = attempt.percentage >= quiz.passing_percentage

        # Check if all answers are graded
        ungraded_answers = StudentAnswer.query.filter_by(
            attempt_id=attempt_id,
            is_final=False
        ).count()

        if ungraded_answers == 0:
            attempt.status = AttemptStatus.GRADED

        db.session.commit()

        return answer.to_dict()

    @staticmethod
    def assign_teacher_to_class(teacher_id, class_id):
        """Assign teacher to a class"""
        teacher = Teacher.query.get(teacher_id)
        class_obj = Class.query.get(class_id)

        if not teacher or not class_obj:
            raise ValueError('Teacher or class not found')

        if class_obj not in teacher.classes:
            teacher.classes.append(class_obj)
            db.session.commit()

        return True

    @staticmethod
    def remove_teacher_from_class(teacher_id, class_id):
        """Remove teacher from a class"""
        teacher = Teacher.query.get(teacher_id)
        class_obj = Class.query.get(class_id)

        if not teacher or not class_obj:
            raise ValueError('Teacher or class not found')

        if class_obj in teacher.classes:
            teacher.classes.remove(class_obj)
            db.session.commit()

        return True
