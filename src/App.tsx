import { ThemeProvider } from './components/shared/ThemeProvider';
import { Toaster } from './components/ui/sonner';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ComponentWrapper from './components/shared/ComponentWrapper';
import LandingPage from './components/LandingPage';
import Login from './components/auth/Login';
import StudentClaim from './components/auth/StudentClaim';
import ForgotPassword from './components/auth/ForgotPassword';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminUsers from './components/admin/AdminUsers';
import AdminClasses from './components/admin/AdminClasses';
import AdminQuizzes from './components/admin/AdminQuizzes';
import TeacherDashboard from './components/teacher/TeacherDashboard';
import TeacherQuizzes from './components/teacher/TeacherQuizzes';
import TeacherClasses from './components/teacher/TeacherClasses';
import QuizBuilder from './components/teacher/QuizBuilder';
import QuestionBank from './components/teacher/QuestionBank';
import StudentManagement from './components/teacher/StudentManagement';
import GradingDashboard from './components/teacher/GradingDashboard';
import QuizMonitor from './components/teacher/QuizMonitor';
import QuizAnalytics from './components/teacher/QuizAnalytics';
import StudentDashboard from './components/student/StudentDashboard';
import QuizAccess from './components/student/QuizAccess';
import QuizTaking from './components/student/QuizTaking';
import StudentResults from './components/student/StudentResults';
import ResultDetail from './components/student/ResultDetail';
import Profile from './components/shared/Profile';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: string }> = ({
  children,
  requiredRole
}) => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && currentUser.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Public Route Component (redirect if logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  const { currentUser } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/claim" element={<PublicRoute><StudentClaim /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

      {/* Admin Routes */}
      <Route path="/admin/dashboard" element={
        <ProtectedRoute requiredRole="admin">
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute requiredRole="admin">
          <AdminUsers />
        </ProtectedRoute>
      } />
      <Route path="/admin/classes" element={
        <ProtectedRoute requiredRole="admin">
          <ComponentWrapper>
            {(props) => <AdminClasses {...props} />}
          </ComponentWrapper>
        </ProtectedRoute>
      } />
      <Route path="/admin/quizzes" element={
        <ProtectedRoute requiredRole="admin">
          <ComponentWrapper>
            {(props) => <AdminQuizzes {...props} />}
          </ComponentWrapper>
        </ProtectedRoute>
      } />

      {/* Teacher Routes */}
      <Route path="/teacher/dashboard" element={
        <ProtectedRoute requiredRole="teacher">
          <TeacherDashboard />
        </ProtectedRoute>
      } />
      <Route path="/teacher/quizzes" element={
        <ProtectedRoute requiredRole="teacher">
          <TeacherQuizzes />
        </ProtectedRoute>
      } />
      <Route path="/teacher/classes" element={
        <ProtectedRoute requiredRole="teacher">
          <TeacherClasses />
        </ProtectedRoute>
      } />
      <Route path="/teacher/quiz-builder" element={
        <ProtectedRoute requiredRole="teacher">
          <QuizBuilder />
        </ProtectedRoute>
      } />
      <Route path="/teacher/quiz/new" element={
        <ProtectedRoute requiredRole="teacher">
          <QuizBuilder />
        </ProtectedRoute>
      } />
      <Route path="/teacher/quiz/edit/:quizId" element={
        <ProtectedRoute requiredRole="teacher">
          <QuizBuilder />
        </ProtectedRoute>
      } />
      <Route path="/teacher/analytics/:quizId" element={
        <ProtectedRoute requiredRole="teacher">
          <QuizAnalytics />
        </ProtectedRoute>
      } />
      <Route path="/teacher/monitor/:quizId" element={
        <ProtectedRoute requiredRole="teacher">
          <QuizMonitor />
        </ProtectedRoute>
      } />
      <Route path="/teacher/question-bank" element={
        <ProtectedRoute requiredRole="teacher">
          <QuestionBank />
        </ProtectedRoute>
      } />
      <Route path="/teacher/students" element={
        <ProtectedRoute requiredRole="teacher">
          <StudentManagement />
        </ProtectedRoute>
      } />
      <Route path="/teacher/grading" element={
        <ProtectedRoute requiredRole="teacher">
          <GradingDashboard />
        </ProtectedRoute>
      } />

      {/* Student Routes */}
      <Route path="/student/dashboard" element={
        <ProtectedRoute requiredRole="student">
          <StudentDashboard />
        </ProtectedRoute>
      } />
      <Route path="/student/quiz-access" element={
        <ProtectedRoute requiredRole="student">
          <QuizAccess />
        </ProtectedRoute>
      } />
      <Route path="/student/quiz-taking/:attemptId" element={
        <ProtectedRoute requiredRole="student">
          <QuizTaking />
        </ProtectedRoute>
      } />
      <Route path="/student/results" element={
        <ProtectedRoute requiredRole="student">
          <StudentResults />
        </ProtectedRoute>
      } />
      <Route path="/student/result/:attemptId" element={
        <ProtectedRoute requiredRole="student">
          <ResultDetail />
        </ProtectedRoute>
      } />

      {/* Shared Routes */}
      <Route path="/profile" element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      } />

      {/* Default Dashboard Redirect */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          {currentUser?.role === 'admin' && <Navigate to="/admin/dashboard" replace />}
          {currentUser?.role === 'teacher' && <Navigate to="/teacher/dashboard" replace />}
          {currentUser?.role === 'student' && <Navigate to="/student/dashboard" replace />}
        </ProtectedRoute>
      } />

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;