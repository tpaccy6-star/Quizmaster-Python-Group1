import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../shared/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, CheckCircle, BarChart3, Trophy, Clock, RefreshCw } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiService } from '../../lib/api';
import { toast } from 'sonner';

export default function StudentDashboard() {
  const { currentUser: user, logout } = useAuth();

  if (!user) {
    return <div>Loading...</div>;
  }
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiService.getStudentDashboard();
        console.log('Dashboard response:', response);
        setDashboardData(response); // API service returns data directly
      } catch (error) {
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await apiService.getStudentDashboard();
      setDashboardData(response); // API service returns data directly
      toast.success('Data refreshed');
    } catch (error) {
      toast.error('Failed to refresh');
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

  // Use data from API response
  const stats = dashboardData?.stats || {};
  const student = dashboardData?.student || {};
  const classInfo = dashboardData?.class || {};
  const availableQuizzes = dashboardData?.available_quizzes || [];
  const recentAttempts = dashboardData?.recent_attempts || [];

  // Calculate additional stats from recent attempts if not provided by API
  const calculatedStats = {
    ...stats,
    avg_score: stats.avg_score || (() => {
      const gradedAttempts = recentAttempts.filter((a: any) => a.status === 'graded' && a.score !== null && a.score !== undefined);
      if (gradedAttempts.length === 0) return 0;
      const totalScore = gradedAttempts.reduce((sum: number, a: any) => {
        const score = a.score ?? 0;
        const totalMarks = a.total_marks || a.totalMarks || 0;
        return sum + (totalMarks > 0 ? (score / totalMarks) * 100 : 0);
      }, 0);
      return Math.round(totalScore / gradedAttempts.length);
    })(),
    best_score: stats.best_score || (() => {
      const gradedAttempts = recentAttempts.filter((a: any) => a.status === 'graded' && a.score !== null && a.score !== undefined);
      if (gradedAttempts.length === 0) return 0;
      return Math.max(...gradedAttempts.map((a: any) => {
        const score = a.score ?? 0;
        const totalMarks = a.total_marks || a.totalMarks || 0;
        return totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
      }));
    })()
  };

  // Recent Activity - use recent_attempts from dashboardData, not stats
  const recentActivity = recentAttempts.slice(0, 5).map((attempt: any) => {
    // Handle both backend field names (quiz_id, total_marks, score, submitted_at) 
    // and frontend field names (quizId, totalMarks, score, submittedAt)
    const quizId = attempt.quiz_id || attempt.quizId;
    const totalMarks = attempt.total_marks || attempt.totalMarks || 0;
    const score = attempt.score ?? 0;
    const submittedAt = attempt.submitted_at || attempt.submittedAt;

    return {
      id: attempt.id,
      title: quizId ? `Quiz ${quizId.slice(0, 8)}...` : 'Unknown Quiz',
      score: totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0,
      date: submittedAt ? new Date(submittedAt).toLocaleDateString() : 'No date',
      status: attempt.status || 'pending',
    };
  });

  // Subject Performance Data (mock for now - should be calculated from real data)
  const subjectPerformance = [
    { subject: 'Math', score: 85 },
    { subject: 'Science', score: 78 },
    { subject: 'History', score: 92 },
    { subject: 'Computer', score: 88 },
  ];

  // Progress Over Time (mock for now - should be calculated from real data)
  const progressData = [
    { month: 'Aug', quizzes: 2, avgScore: 75 },
    { month: 'Sep', quizzes: 3, avgScore: 80 },
    { month: 'Oct', quizzes: 4, avgScore: 85 },
    { month: 'Nov', quizzes: 5, avgScore: 82 },
    { month: 'Dec', quizzes: 3, avgScore: 88 },
  ];

  // Difficulty Breakdown (mock for now - should be calculated from real data)
  const difficultyData = [
    { name: 'Easy', value: 45, color: '#10B981' },
    { name: 'Medium', value: 35, color: '#F59E0B' },
    { name: 'Hard', value: 20, color: '#EF4444' },
  ];

  return (
    <DashboardLayout user={user} onLogout={logout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl text-gray-900 dark:text-white">Student Dashboard</h1>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-gray-600 dark:text-gray-400">
                Welcome back, {user?.name || 'Student'}! Here's your learning progress
              </p>
              {classInfo && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    {classInfo.name} - {classInfo.section}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Quizzes Taken</p>
                <p className="text-2xl text-gray-900 dark:text-white mt-1">{calculatedStats?.total_attempts || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-2xl text-gray-900 dark:text-white mt-1">{calculatedStats?.completed_attempts || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Average Score</p>
                <p className="text-2xl text-gray-900 dark:text-white mt-1">{calculatedStats?.avg_score || 0}%</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Best Score</p>
                <p className="text-2xl text-gray-900 dark:text-white mt-1">{calculatedStats?.best_score || 0}%</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <Trophy className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Subject Performance */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg text-gray-900 dark:text-white mb-4">Subject Performance</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={subjectPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="subject" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }} />
                <Bar dataKey="score" fill="#3B82F6" name="Average Score (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Progress Over Time */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg text-gray-900 dark:text-white mb-4">Progress Over Time</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }} />
                <Legend />
                <Line type="monotone" dataKey="quizzes" stroke="#3B82F6" strokeWidth={2} name="Quizzes Taken" />
                <Line type="monotone" dataKey="avgScore" stroke="#10B981" strokeWidth={2} name="Avg Score (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Difficulty Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg text-gray-900 dark:text-white mb-4">Difficulty Breakdown</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={difficultyData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {difficultyData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg text-gray-900 dark:text-white mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity: any) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-900 dark:text-white">{activity.title}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{activity.date}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg text-gray-900 dark:text-white">{activity.score}%</span>
                      <span className={`px-3 py-1 rounded-full text-xs ${activity.status === 'graded'
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                        : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
                        }`}>
                        {activity.status === 'graded' ? 'Graded' : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                  No quiz attempts yet
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/student/quiz-access"
              className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div>
                <div className="text-gray-900 dark:text-white">Take a Quiz</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Enter access code</div>
              </div>
            </Link>
            <Link
              to="/student/results"
              className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            >
              <BarChart3 className="w-8 h-8 text-green-600 dark:text-green-400" />
              <div>
                <div className="text-gray-900 dark:text-white">View Results</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">See your scores</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
