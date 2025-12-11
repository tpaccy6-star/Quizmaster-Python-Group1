from app import create_app, db
from app.models.quiz import Quiz, QuizStatus

app = create_app()

with app.app_context():
    # Create a new quiz that is not assigned to any class
    global_quiz = Quiz(
        title="Global Test Quiz",
        subject="General Knowledge",
        description="This is a test quiz available to all students.",
        time_limit_minutes=60,  # Add default value
        status=QuizStatus.PUBLISHED,
        created_by="f9850eea-1275-411e-9848-2110afc88f60"  # Using an existing teacher ID
    )
    db.session.add(global_quiz)
    db.session.commit()
    print(f"Successfully added global quiz: {global_quiz.title}")
