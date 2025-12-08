import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  GraduationCap,
  FileText,
  BarChart3,
  Clock,
  UserCircle,
  Building
} from 'lucide-react';
import { User, UserRole } from '../../contexts/AuthContext';
import { useTheme } from './ThemeProvider';
import NotificationCenter from './NotificationCenter';

interface DashboardLayoutProps {
  children: ReactNode;
  user: User;
  onLogout: () => void;
}

interface NavItem {
  path: string;
  label: string;
  icon: ReactNode;
}

const getNavItems = (role: UserRole): NavItem[] => {
  if (role === 'admin') {
    return [
      { path: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { path: '/admin/users', label: 'Users', icon: <Users className="w-5 h-5" /> },
      { path: '/admin/classes', label: 'Classes', icon: <Building className="w-5 h-5" /> },
      { path: '/admin/quizzes', label: 'Quizzes', icon: <FileText className="w-5 h-5" /> },
    ];
  } else if (role === 'teacher') {
    return [
      { path: '/teacher', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { path: '/teacher/classes', label: 'Classes', icon: <Building className="w-5 h-5" /> },
      { path: '/teacher/quizzes', label: 'Quizzes', icon: <FileText className="w-5 h-5" /> },
      { path: '/teacher/question-bank', label: 'Question Bank', icon: <BookOpen className="w-5 h-5" /> },
      { path: '/teacher/students', label: 'Students', icon: <Users className="w-5 h-5" /> },
      { path: '/teacher/grading', label: 'Grading', icon: <BarChart3 className="w-5 h-5" /> },
    ];
  } else {
    return [
      { path: '/student', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { path: '/student/quizzes', label: 'Quizzes', icon: <FileText className="w-5 h-5" /> },
      { path: '/student/results', label: 'Results', icon: <BarChart3 className="w-5 h-5" /> },
    ];
  }
};

export default function DashboardLayout({ children, user, onLogout }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const navItems = getNavItems(user.role);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Logo/Title */}
            <div className="flex items-center gap-2">
              <GraduationCap className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="font-bold text-gray-900 dark:text-white">Quiz Management</h1>
                <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">{user.role} Portal</p>
              </div>
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Notification Center */}
            <NotificationCenter userId={user.id} />

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              ) : (
                <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              )}
            </button>

            {/* User menu */}
            <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700">
              <UserCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-[61px] left-0 z-30 h-[calc(100vh-61px)]
            w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
            transition-transform duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <nav className="p-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                  ${isActive(item.path)
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

            {/* Profile link */}
            <Link
              to="/profile"
              onClick={() => setIsSidebarOpen(false)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                ${location.pathname.includes('/profile')
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              <Settings className="w-5 h-5" />
              <span>Profile</span>
            </Link>

            {/* Logout button */}
            <button
              onClick={() => {
                setIsSidebarOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-6 min-h-[calc(100vh-61px)]">
          {children}
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
