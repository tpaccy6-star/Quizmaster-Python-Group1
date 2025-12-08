import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../shared/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Users, BarChart3, TrendingUp, Plus, RefreshCw, Download, Printer, Building } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiService } from '../../lib/api';
import { toast } from 'sonner';

export default function TeacherDashboard() {
  const { currentUser: user, logout } = useAuth();

  if (!user) {
    return <div>Loading...</div>;
  }
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Prevent multiple simultaneous calls
      if (dashboardData !== null) {
        console.log('Dashboard data already loaded, skipping fetch');
        return;
      }

      try {
        const response = await apiService.getTeacherDashboard();
        console.log('Dashboard response:', response);

        // Ensure we're setting a stable object reference
        const data = response.data || response;
        if (data && typeof data === 'object') {
          setDashboardData(data);
        } else {
          console.warn('Invalid dashboard data format:', data);
          setDashboardData({});
        }
      } catch (error) {
        console.error('Dashboard error:', error);
        toast.error('Failed to load dashboard');
        setDashboardData({});
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []); // Empty dependency array - only run once

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await apiService.getTeacherDashboard();
      setDashboardData(response.data || response);
      toast.success('Data refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading || !dashboardData) {
    return (
      <DashboardLayout user={user} onLogout={logout}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Extract data from dashboard response
  console.log('Dashboard data received:', dashboardData);
  const stats = dashboardData.stats || {};
  const totalQuizzes = stats.total_quizzes || 0;
  const publishedQuizzes = stats.published_quizzes || 0;
  const totalStudents = stats.total_students || 0;
  const teacherClasses = dashboardData.classes || [];
  const avgScore = stats.average_score || 0;
  const completionRate = stats.completion_rate || 0;
  const quizPerformance = dashboardData.quiz_performance || [];
  const teacherAttempts = dashboardData.recent_attempts || [];
  const students = dashboardData.students || [];
  const quizzes = dashboardData.quizzes || [];

  console.log('Extracted data:', {
    totalQuizzes,
    publishedQuizzes,
    totalStudents,
    avgScore,
    completionRate,
    quizPerformance: quizPerformance.length,
    teacherAttempts: teacherAttempts.length
  });

  const handleExportCSV = () => {
    const csvData = [
      ['Teacher Dashboard Report'],
      ['Teacher:', user.name],
      ['Generated:', new Date().toLocaleString()],
      [''],
      ['Summary Statistics'],
      ['Total Quizzes:', totalQuizzes.toString()],
      ['Published Quizzes:', publishedQuizzes.toString()],
      ['Total Students:', totalStudents.toString()],
      ['Total Classes:', teacherClasses.length.toString()],
      ['Average Score:', `${avgScore}%`],
      ['Completion Rate:', `${completionRate}%`],
      [''],
      ['Quiz Performance'],
      ['Quiz Title', 'Average Score (%)', 'Participants'],
      ...quizPerformance.map((q: any) => [q.name, q.score.toString(), q.participants.toString()]),
      [''],
      ['Recent Quiz Attempts'],
      ['Student', 'Quiz', 'Score', 'Status'],
      ...teacherAttempts.slice(0, 20).map((attempt: any) => {
        const student = students.find((s: any) => s.id === attempt.studentId);
        const quiz = quizzes.find((q: any) => q.id === attempt.quizId);
        return [
          student?.name || 'Unknown',
          quiz?.title || 'Unknown',
          `${attempt.score}/${attempt.totalMarks}`,
          attempt.status
        ];
      }),
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teacher-dashboard-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Dashboard data exported as CSV');
  };

  const handlePrint = () => {
    window.print();
    toast.success('Print dialog opened');
  };

  // Use data from API response
  const dashboardStats = dashboardData;

  // Quiz Performance Data

  // Student Progress Over Time
  const progressData = dashboardStats?.progress_data || [
    { month: 'Aug', started: 12, completed: 10 },
    { month: 'Sep', started: 18, completed: 15 },
    { month: 'Oct', started: 22, completed: 20 },
    { month: 'Nov', started: 28, completed: 25 },
    { month: 'Dec', started: 32, completed: 30 },
  ];

  // Topic Difficulty Analysis
  const difficultyData = dashboardStats?.difficulty_data || [
    { difficulty: 'Easy', correct: 85, incorrect: 15 },
    { difficulty: 'Medium', correct: 65, incorrect: 35 },
    { difficulty: 'Hard', correct: 45, incorrect: 55 },
  ];

  return (
    <DashboardLayout user={user} onLogout={logout}>
      <div className="space-y-6" ref={printRef}>
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl text-gray-900 dark:text-white">Teacher Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Welcome back, {user.name}
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col items-center text-center">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-1">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-xl text-gray-900 dark:text-white">{stats?.total_quizzes || 0}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Quizzes</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col items-center text-center">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mb-1">
                <Building className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-xl text-gray-900 dark:text-white">{teacherClasses.length}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Classes</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col items-center text-center">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mb-1">
                <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-xl text-gray-900 dark:text-white">{stats?.total_students || 0}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Students</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col items-center text-center">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center mb-1">
                <BarChart3 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <p className="text-xl text-gray-900 dark:text-white">{stats?.avg_score || 0}%</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Score</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col items-center text-center">
              <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center mb-1">
                <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="text-xl text-gray-900 dark:text-white">{stats?.completion_rate || 0}%</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Complete</p>
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quiz Performance */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg text-gray-900 dark:text-white mb-4">Quiz Performance</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={quizPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" angle={-15} textAnchor="end" height={80} />
                <YAxis stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="score" fill="#3B82F6" name="Avg Score (%)" />
                <Bar dataKey="participants" fill="#10B981" name="Participants" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Student Progress */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg text-gray-900 dark:text-white mb-4">Student Progress Over Time</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }} />
                <Legend />
                <Line type="monotone" dataKey="started" stroke="#3B82F6" strokeWidth={2} name="Started" />
                <Line type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={2} name="Completed" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Topic Difficulty Analysis */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg text-gray-900 dark:text-white mb-4">Topic Difficulty Analysis</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={difficultyData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9CA3AF" />
              <YAxis dataKey="difficulty" type="category" stroke="#9CA3AF" />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }} />
              <Legend />
              <Bar dataKey="correct" stackId="a" fill="#10B981" name="Correct (%)" />
              <Bar dataKey="incorrect" stackId="a" fill="#EF4444" name="Incorrect (%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/teacher/quiz/new"
              className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <Plus className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div>
                <div className="text-gray-900 dark:text-white">Create Quiz</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">New assessment</div>
              </div>
            </Link>
            <Link
              to="/teacher/classes"
              className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            >
              <Users className="w-8 h-8 text-green-600 dark:text-green-400" />
              <div>
                <div className="text-gray-900 dark:text-white">My Classes</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">View assigned classes</div>
              </div>
            </Link>
            <Link
              to="/teacher/question-bank"
              className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
            >
              <FileText className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              <div>
                <div className="text-gray-900 dark:text-white">Question Bank</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Manage questions</div>
              </div>
            </Link>
            <Link
              to="/teacher/grading"
              className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
            >
              <BarChart3 className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              <div>
                <div className="text-gray-900 dark:text-white">Grade Submissions</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Review answers</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}