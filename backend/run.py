import os
from app import create_app, socketio
from app.models import *

# Create the Flask app
app = create_app()

if __name__ == '__main__':
    # Get environment variables
    host = os.getenv('FLASK_HOST', '127.0.0.1')
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'

    print(f"Starting QuizMaster Backend Server...")
    print(f"Host: {host}")
    print(f"Port: {port}")
    print(f"Debug: {debug}")
    print(f"Database URL: {app.config['SQLALCHEMY_DATABASE_URI']}")

    # Run the app with SocketIO
    socketio.run(
        app,
        host=host,
        port=port,
        debug=debug
    )
