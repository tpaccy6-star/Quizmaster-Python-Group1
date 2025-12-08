
  # Quiz Management System

**Version:** 2.0  
**Status:** Production Ready  
**Last Updated:** December 8, 2025

A comprehensive Quiz Management System with real-time notifications, attempt management, and anti-cheating features.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Python 3.9+
- PostgreSQL 15+ OR MySQL 8.0+

### Frontend Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Backend Setup (Choose One)

#### Option A: FastAPI + PostgreSQL
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup database
createdb quiz_management_db
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

#### Option B: Flask + MySQL
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Setup database
mysql -u root -p
> CREATE DATABASE quiz_management_db;
flask db upgrade

# Start server
python run.py
```

## 📚 Documentation

**📖 START HERE:** `src/README_COMPLETE_SYSTEM.md`

### Key Documentation Files
- `src/INTEGRATION_GUIDE.md` - Step-by-step setup guide
- `src/FINAL_SYSTEM_COMPLETE.md` - Complete feature overview
- `src/PYTHON_BACKEND_GUIDE.md` - FastAPI backend setup
- `src/FLASK_MYSQL_BACKEND_GUIDE.md` - Flask backend setup
- `src/BACKEND_UPDATES_NOTIFICATIONS_ATTEMPTS.md` - New features implementation

## 🎯 Key Features

- **3 User Roles:** Admin, Teacher, Student
- **Real-time Notifications:** In-app and email notifications
- **Attempt Management:** Reset attempts, track history
- **Anti-Cheating:** Fullscreen enforcement, tab switch detection
- **Quiz Builder:** Drag-and-drop interface with multiple question types
- **Analytics:** Comprehensive dashboards and reporting
- **Grading System:** Auto and manual grading with feedback

## 👥 Demo Accounts

### Admin
- Email: `admin@quiz.com` / Password: `admin123`

### Teachers
- Email: `john@teacher.com` / Password: `teacher123`
- Email: `sarah@teacher.com` / Password: `teacher123`

### Students
- Email: `alice@student.com` / Password: `student123`
- OR Registration: `STU2024001` / Password: `student123`

## 🛠️ Technology Stack

### Frontend
- React 18 + TypeScript
- Tailwind CSS v4.0
- Shadcn UI components
- Recharts for analytics
- Lucide React icons

### Backend
- **Option A:** FastAPI + PostgreSQL
- **Option B:** Flask + MySQL
- JWT authentication
- WebSocket support for real-time features

## 📝 Project Structure

```
quiz-management-system/
├── src/                    # React frontend source
│   ├── components/         # React components
│   ├── lib/               # Utilities and API
│   └── styles/            # Stylesheets
├── backend/               # Backend implementation
│   ├── fastapi/          # FastAPI option
│   └── flask/            # Flask option
└── docs/                 # Documentation
```

## 🚀 Deployment

### Frontend
```bash
npm run build
# Deploy dist/ folder to Vercel/Netlify
```

### Backend
```bash
# Using Docker
docker-compose up -d

# Or traditional deployment
# See backend documentation for details
```

## 🆘 Support

For detailed setup instructions, troubleshooting, and feature guides, please refer to the comprehensive documentation in the `src/` directory, starting with `README_COMPLETE_SYSTEM.md`.

---

**Happy Quiz Management!** 🎓
  