# Database Seeder
# Populates the database with sample data for testing

import random
from datetime import datetime, timedelta
from app import create_app, db
from app.models.user import User, UserRole
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.class_model import Class
from app.models.quiz import Quiz, QuizStatus
from app.models.question import Question, QuestionType, Difficulty
from app.models.quiz_question import QuizQuestion


def seed_users():
    """Create sample users"""
    print("Seeding users...")

    # Admin user
    admin = User(
        email='admin@quizmaster.com',
        name='System Administrator',
        role=UserRole.ADMIN
    )
    admin.set_password('admin123')
    db.session.add(admin)

    # Teachers
    teachers_data = [
        {
            'email': 'john.smith@school.edu',
            'name': 'John Smith',
            'password': 'teacher123',
            'subject': 'Mathematics',
            'department': 'Science',
            'bio': 'Mathematics teacher with 10 years of experience'
        },
        {
            'email': 'sarah.jones@school.edu',
            'name': 'Sarah Jones',
            'password': 'teacher123',
            'subject': 'Physics',
            'department': 'Science',
            'bio': 'Physics enthusiast and researcher'
        },
        {
            'email': 'mike.wilson@school.edu',
            'name': 'Mike Wilson',
            'password': 'teacher123',
            'subject': 'Computer Science',
            'department': 'Technology',
            'bio': 'Software developer turned educator'
        }
    ]

    for t_data in teachers_data:
        teacher_user = User(
            email=t_data['email'],
            name=t_data['name'],
            role=UserRole.TEACHER
        )
        teacher_user.set_password(t_data['password'])
        db.session.add(teacher_user)
        db.session.flush()

        teacher = Teacher(
            id=teacher_user.id,
            subject=t_data['subject'],
            department=t_data['department'],
            bio=t_data['bio']
        )
        db.session.add(teacher)

    # Students
    students_data = []
    for i in range(1, 31):  # 30 students
        students_data.append({
            'email': f'student{i:02d}@school.edu',
            'name': f'Student {i:02d}',
            'password': 'student123',
            'registration_number': f'STU{2024}{i:03d}',
            'date_of_birth': '2005-01-01'
        })

    for s_data in students_data:
        student_user = User(
            email=s_data['email'],
            name=s_data['name'],
            role=UserRole.STUDENT
        )
        student_user.set_password(s_data['password'])
        db.session.add(student_user)
        db.session.flush()

        student = Student(
            id=student_user.id,
            registration_number=s_data['registration_number'],
            date_of_birth=datetime.strptime(
                s_data['date_of_birth'], '%Y-%m-%d').date()
        )
        db.session.add(student)

    db.session.commit()
    print(f"Created 1 admin, 3 teachers, and 30 students")


def seed_classes():
    """Create sample classes"""
    print("Seeding classes...")

    teachers = Teacher.query.all()
    students = Student.query.all()

    classes_data = [
        {'name': 'Mathematics 101', 'section': 'A', 'academic_year': '2024'},
        {'name': 'Physics 101', 'section': 'B', 'academic_year': '2024'},
        {'name': 'Computer Science 101', 'section': 'A', 'academic_year': '2024'},
        {'name': 'Mathematics 102', 'section': 'B', 'academic_year': '2024'}
    ]

    for i, c_data in enumerate(classes_data):
        class_obj = Class(
            name=c_data['name'],
            section=c_data['section'],
            academic_year=c_data['academic_year'],
            created_by=User.query.filter_by(role=UserRole.ADMIN).first().id
        )
        db.session.add(class_obj)
        db.session.flush()

        # Assign teacher
        if i < len(teachers):
            class_obj.teachers.append(teachers[i])

        # Assign 10 students to each class
        start_idx = i * 10
        end_idx = start_idx + 10
        for student in students[start_idx:end_idx]:
            student.class_id = class_obj.id

    db.session.commit()
    print(f"Created {len(classes_data)} classes")


def seed_questions():
    """Create sample questions"""
    print("Seeding questions...")

    teachers = Teacher.query.all()

    # Math questions
    math_questions = [
        {
            'text': 'What is the derivative of x^2?',
            'type': QuestionType.MCQ,
            'options': ['2x', 'x', '2', 'x^2'],
            'correct_answer': 0,
            'marks': 5,
            'difficulty': Difficulty.EASY
        },
        {
            'text': 'Solve for x: 2x + 5 = 15',
            'type': QuestionType.SHORT_ANSWER,
            'sample_answer': 'x = 5',
            'marks': 10,
            'difficulty': Difficulty.MEDIUM
        }
    ]

    # Physics questions
    physics_questions = [
        {
            'text': 'What is Newton\'s second law of motion?',
            'type': QuestionType.DESCRIPTIVE,
            'sample_answer': 'F = ma',
            'marks': 15,
            'difficulty': Difficulty.MEDIUM
        },
        {
            'text': 'What is the speed of light?',
            'type': QuestionType.MCQ,
            'options': ['3x10^8 m/s', '3x10^6 m/s', '3x10^10 m/s', '3x10^4 m/s'],
            'correct_answer': 0,
            'marks': 5,
            'difficulty': Difficulty.EASY
        }
    ]

    # Computer Science questions
    cs_questions = [
        {
            'text': 'What is the time complexity of binary search?',
            'type': QuestionType.MCQ,
            'options': ['O(n)', 'O(log n)', 'O(n^2)', 'O(1)'],
            'correct_answer': 1,
            'marks': 5,
            'difficulty': Difficulty.EASY
        },
        {
            'text': 'Explain the concept of recursion',
            'type': QuestionType.DESCRIPTIVE,
            'sample_answer': 'A function calling itself',
            'marks': 20,
            'difficulty': Difficulty.HARD
        }
    ]

    all_questions = math_questions + physics_questions + cs_questions

    for i, q_data in enumerate(all_questions):
        teacher_idx = i % len(teachers)
        question = Question(
            text=q_data['text'],
            type=q_data['type'],
            created_by=teachers[teacher_idx].id,
            topic=f"Topic {i+1}",
            difficulty=q_data.get('difficulty', Difficulty.MEDIUM),
            marks=q_data['marks'],
            options=q_data.get('options'),
            correct_answer=q_data.get('correct_answer'),
            sample_answer=q_data.get('sample_answer')
        )
        db.session.add(question)

    db.session.commit()
    print(f"Created {len(all_questions)} questions")


def seed_quizzes():
    """Create sample quizzes"""
    print("Seeding quizzes...")

    teachers = Teacher.query.all()
    questions = Question.query.all()
    classes = Class.query.all()

    quizzes_data = [
        {
            'title': 'Mathematics Basics Quiz',
            'subject': 'Mathematics',
            'description': 'Basic mathematics concepts',
            'time_limit_minutes': 30,
            'passing_percentage': 60,
            'max_attempts': 3
        },
        {
            'title': 'Physics Fundamentals',
            'subject': 'Physics',
            'description': 'Fundamental physics concepts',
            'time_limit_minutes': 45,
            'passing_percentage': 70,
            'max_attempts': 2
        },
        {
            'title': 'Computer Science Introduction',
            'subject': 'Computer Science',
            'description': 'Introduction to computer science',
            'time_limit_minutes': 60,
            'passing_percentage': 50,
            'max_attempts': 2
        }
    ]

    for i, q_data in enumerate(quizzes_data):
        quiz = Quiz(
            title=q_data['title'],
            subject=q_data['subject'],
            description=q_data['description'],
            time_limit_minutes=q_data['time_limit_minutes'],
            passing_percentage=q_data['passing_percentage'],
            max_attempts=q_data['max_attempts'],
            created_by=teachers[i].id,
            status=QuizStatus.PUBLISHED
        )
        db.session.add(quiz)
        db.session.flush()

        # Assign to relevant class
        if i < len(classes):
            quiz.classes.append(classes[i])

        # Add questions to quiz
        start_idx = i * 2
        for j in range(2):
            if start_idx + j < len(questions):
                qq = QuizQuestion(
                    quiz_id=quiz.id,
                    question_id=questions[start_idx + j].id,
                    order_index=j + 1
                )
                db.session.add(qq)

    db.session.commit()
    print(f"Created {len(quizzes_data)} quizzes")


def main():
    """Main seeding function"""
    app = create_app()

    with app.app_context():
        # Drop all tables
        db.drop_all()
        print("Dropped all tables")

        # Create all tables
        db.create_all()
        print("Created all tables")

        # Seed data
        seed_users()
        seed_classes()
        seed_questions()
        seed_quizzes()

        print("\nDatabase seeding completed successfully!")
        print("\nLogin credentials:")
        print("Admin: admin@quizmaster.com / admin123")
        print("Teacher: john.smith@school.edu / teacher123")
        print("Student: student01@school.edu / student123")


if __name__ == '__main__':
    main()
