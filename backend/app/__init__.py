from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_mail import Mail
from flask_marshmallow import Marshmallow
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache
import os
from dotenv import load_dotenv

# Configure PyMySQL to work with SQLAlchemy
import pymysql
pymysql.install_as_MySQLdb()

load_dotenv()

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
bcrypt = Bcrypt()
cors = CORS()
socketio = SocketIO()
mail = Mail()
ma = Marshmallow()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)
cache = Cache()


def create_app(config_name='development'):
    app = Flask(__name__)

    # Configuration
    app.config['SECRET_KEY'] = os.getenv(
        'SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
        'DATABASE_URL', 'mysql://root:password@localhost/quiz_management_db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.getenv(
        'JWT_SECRET_KEY', 'jwt-secret-string')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = int(
        os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 3600))  # 1 hour
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = int(
        os.getenv('JWT_REFRESH_TOKEN_EXPIRES', 2592000))  # 30 days

    # Mail configuration
    app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
    app.config['MAIL_USE_TLS'] = os.getenv(
        'MAIL_USE_TLS', 'true').lower() == 'true'
    app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')

    # Cache configuration
    app.config['CACHE_TYPE'] = os.getenv('CACHE_TYPE', 'simple')
    app.config['CACHE_DEFAULT_TIMEOUT'] = 300

    # Disable rate limiting for local development to avoid throttling the SPA
    if app.config.get('ENV', 'production') == 'development' or app.config.get('DEBUG'):
        app.config['RATELIMIT_ENABLED'] = False

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})
    socketio.init_app(app)
    mail.init_app(app)
    ma.init_app(app)
    limiter.init_app(app)
    cache.init_app(app)

    # Register modular blueprints
    from app.modules.auth.auth_controller import auth_bp
    from app.modules.admin.admin_controller import admin_bp
    from app.modules.teacher.teacher_controller import teacher_bp
    from app.modules.student.student_controller import student_bp
    from app.modules.quiz.quiz_controller import quiz_bp
    from app.modules.notifications.notification_controller import notifications_bp
    from app.modules.attempts.attempt_controller import attempts_bp

    # Register routes blueprints
    from app.routes.teacher import teacher_bp as teacher_routes_bp
    from app.routes.grading import grading_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(teacher_bp, url_prefix='/api/teacher')
    app.register_blueprint(student_bp, url_prefix='/api/student')
    app.register_blueprint(quiz_bp, url_prefix='/api/quizzes')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(attempts_bp, url_prefix='/api/attempts')
    app.register_blueprint(grading_bp, url_prefix='/api/grading')

    # Register routes with override (routes take precedence)
    app.register_blueprint(
        teacher_routes_bp, url_prefix='/api/teacher', name='teacher_routes')

    return app
