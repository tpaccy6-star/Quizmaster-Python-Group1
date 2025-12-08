from app import create_app

app = create_app()

if __name__ == '__main__':
    with app.app_context():
        print("Flask app created successfully!")
        print("Testing database connection...")
        try:
            from app import db
            db.create_all()
            print("Database tables created successfully!")
        except Exception as e:
            print(f"Database error: {e}")
            print("Make sure MySQL is running and database exists.")
