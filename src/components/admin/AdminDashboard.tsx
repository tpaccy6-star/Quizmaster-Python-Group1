import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../shared/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users, GraduationCap, FileText, Building, RefreshCw, TrendingUp,
  TrendingDown, Award, AlertCircle, Activity, BarChart3, Download, Printer
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { apiService } from '../../lib/api';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const { currentUser: user, logout } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedView, setSelectedView] = useState<'overview' | 'engagement' | 'performance'>('overview');
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch dashboard data from API
  useEffect(() => {
    const fetchDashboardData = async () => {
      // Prevent multiple simultaneous calls
      if (dashboardStats !== null) {
        console.log('Dashboard data already loaded, skipping fetch');
        return;
      }

      try {
        const response = await apiService.getDashboardStats();
        console.log('Admin dashboard response:', response);
        console.log('Response data:', response.data);
        console.log('Response structure:', JSON.stringify(response, null, 2));

        // API returns data directly in response, not in response.data
        if (response && typeof response === 'object') {
          setDashboardStats(response);
        } else {
          console.warn('Invalid admin dashboard data format:', response);
          setDashboardStats({});
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        toast.error('Failed to load dashboard data');
        setDashboardStats({}); // Set empty object to prevent crashes
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []); // Empty dependency array - only run once

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await apiService.getDashboardStats();
      if (response.data) {
        setDashboardStats(response.data);
        toast.success('Data refreshed successfully');
      }
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading || !dashboardStats) {
    return (
      <DashboardLayout user={user!} onLogout={logout}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Use data from API response
  const stats = dashboardStats;

  // Extract data from dashboard response with fallbacks
  const classes = Array.isArray(dashboardStats.classes) ? dashboardStats.classes : [];
  const students = Array.isArray(dashboardStats.students) ? dashboardStats.students : [];
  const quizAttempts = Array.isArray(dashboardStats.quiz_attempts) ? dashboardStats.quiz_attempts : [];
  const quizzes = Array.isArray(dashboardStats.quizzes) ? dashboardStats.quizzes : [];
  const teachers = Array.isArray(dashboardStats.teachers) ? dashboardStats.teachers : [];

  // Extract stats - use direct response properties
  const totalUsers = stats?.total_users || stats?.total_users || 0;
  const totalTeachers = stats?.teacher_count || 0;
  const totalStudents = stats?.student_count || 0;
  const totalClasses = stats?.total_classes || 0;
  const totalQuizzes = 0; // Not in API response
  const publishedQuizzes = 0; // Not in API response  
  const totalAttempts = 0; // Not in API response
  const avgSystemScore = 0; // Not in API response
  const claimedAccounts = stats?.active_users || 0;
  const unclaimedAccounts = stats?.inactive_users || 0;

  // Calculate derived values
  const activeStudents = students.filter((s: any) => s.lastLogin).length;
  const activeStudentsPercentage = totalStudents > 0 ? (activeStudents / totalStudents * 100).toFixed(1) : '0';
  const completedAttempts = quizAttempts.filter((a: any) => a.status === 'completed').length;
  const completionRate = totalAttempts > 0 ? (completedAttempts / totalAttempts * 100).toFixed(1) : '0';

  // User Distribution Data
  const userDistribution = [
    { name: 'Admins', value: stats?.admin_count || 0, color: '#3B82F6' },
    { name: 'Teachers', value: stats?.teacher_count || 0, color: '#8B5CF6' },
    { name: 'Students', value: stats?.student_count || 0, color: '#10B981' },
  ];

  // Quiz Status Distribution
  const quizStatusData = [
    { name: 'Published', value: stats?.published_quizzes || 0, color: '#10B981' },
    { name: 'Draft', value: stats?.draft_quizzes || 0, color: '#F59E0B' },
  ];

  // Account Status
  const accountStatusData = [
    { name: 'Claimed', value: stats?.claimed_accounts || 0, color: '#10B981' },
    { name: 'Unclaimed', value: stats?.unclaimed_accounts || 0, color: '#EF4444' },
  ];

  // Mock timeline data (last 6 months)
  const activityTimeline = [
    { month: 'Jul', quizzes: 5, attempts: 45, users: 20 },
    { month: 'Aug', quizzes: 8, attempts: 72, users: 28 },
    { month: 'Sep', quizzes: 12, attempts: 108, users: 35 },
    { month: 'Oct', quizzes: 15, attempts: 135, users: 42 },
    { month: 'Nov', quizzes: 18, attempts: 162, users: 48 },
    { month: 'Dec', quizzes: 22, attempts: 180, users: 55 },
  ];

  // Class-wise performance
  const classPerformance = classes.map((cls: any) => {
    const classStudents = students.filter((s: any) => s.classId === cls.id);
    const classAttempts = quizAttempts.filter((a: any) =>
      classStudents.some((s: any) => s.id === a.studentId)
    );
    const avgScore = classAttempts.reduce((sum: number, a: any) => sum + a.score, 0) / classAttempts.length || 0;

    return {
      name: cls.name,
      students: cls.studentCount,
      attempts: classAttempts.length,
      avgScore: avgScore.toFixed(1),
    };
  });

  // Teacher activity
  const teacherActivity = teachers.map((teacher: any) => {
    const teacherQuizzes = quizzes.filter((q: any) => q.createdBy === teacher.id);
    const teacherAttempts = teacherQuizzes.reduce((sum: number, q: any) => {
      return sum + quizAttempts.filter((a: any) => a.quizId === q.id).length;
    }, 0);

    return {
      name: teacher.name,
      subject: teacher.subject,
      quizzes: teacherQuizzes.length,
      attempts: teacherAttempts,
      classes: teacher.classIds.length,
    };
  }).sort((a, b) => b.quizzes - a.quizzes);

  // Top performing students
  const studentPerformance = students.map(student => {
    const studentAttempts = quizAttempts.filter(a => a.studentId === student.id);
    const avgScore = studentAttempts.length > 0
      ? studentAttempts.reduce((sum, a) => sum + (a.score / a.totalMarks) * 100, 0) / studentAttempts.length
      : 0;

    return {
      name: student.name,
      class: student.className,
      attempts: studentAttempts.length,
      avgScore: avgScore.toFixed(1),
    };
  }).sort((a, b) => parseFloat(b.avgScore) - parseFloat(a.avgScore)).slice(0, 10);

  // Most active classes
  const mostActiveClasses = [...classPerformance]
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, 5);

  const handleExportCSV = () => {
    const csvData = [
      ['Admin Analytics Report'],
      ['Generated on:', new Date().toLocaleDateString()],
      [''],
      ['System Overview'],
      ['Total Users:', totalUsers.toString()],
      ['Teachers:', totalTeachers.toString()],
      ['Students:', totalStudents.toString()],
      ['Classes:', totalClasses.toString()],
      ['Total Quizzes:', totalQuizzes.toString()],
      ['Published Quizzes:', publishedQuizzes.toString()],
      ['Total Attempts:', totalAttempts.toString()],
      ['Average Score:', `${avgSystemScore}%`],
      [''],
      ['Teacher Activity'],
      ['Teacher Name', 'Subject', 'Quizzes Created', 'Total Attempts', 'Classes'],
      ...teacherActivity.map(t => [t.name, t.subject, t.quizzes.toString(), t.attempts.toString(), t.classes.toString()]),
      [''],
      ['Top Performing Students'],
      ['Student Name', 'Class', 'Attempts', 'Average Score (%)'],
      ...studentPerformance.map(s => [s.name, s.class, s.attempts.toString(), s.avgScore]),
      [''],
      ['Class Performance'],
      ['Class Name', 'Students', 'Attempts', 'Average Score (%)'],
      ...classPerformance.map(c => [c.name, c.students.toString(), c.attempts.toString(), c.avgScore]),
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Analytics exported as CSV');
  };

  const handlePrint = () => {
    window.print();
    toast.success('Print dialog opened');
  };

  return (
    <DashboardLayout user={user!} onLogout={logout}>
      <div className="space-y-6" ref={printRef}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 dark:text-white">Admin Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              System-wide overview and comprehensive analytics
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
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
              Refresh
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 print:hidden">
          <button
            onClick={() => setSelectedView('overview')}
            className={`px-4 py-2 border-b-2 transition-colors ${selectedView === 'overview'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
          >
            System Overview
          </button>
          <button
            onClick={() => setSelectedView('engagement')}
            className={`px-4 py-2 border-b-2 transition-colors ${selectedView === 'engagement'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
          >
            User Engagement
          </button>
          <button
            onClick={() => setSelectedView('performance')}
            className={`px-4 py-2 border-b-2 transition-colors ${selectedView === 'performance'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
          >
            Performance Metrics
          </button>
        </div>

        {/* Overview Tab */}
        {selectedView === 'overview' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
                    <p className="text-gray-900 dark:text-white mt-1">{stats?.total_users || 0}</p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      +12% from last month
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Quizzes</p>
                    <p className="text-gray-900 dark:text-white mt-1">{stats?.total_quizzes || 0}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {stats?.published_quizzes || 0} published, {stats?.draft_quizzes || 0} draft
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Quiz Attempts</p>
                    <p className="text-gray-900 dark:text-white mt-1">{stats?.total_attempts || 0}</p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      {stats?.pending_grading || 0} pending grading
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Avg System Score</p>
                    <p className="text-gray-900 dark:text-white mt-1">{stats?.avg_score || 0}%</p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      +3.2% improvement
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                    <Award className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Active Students</p>
                    <p className="text-gray-900 dark:text-white">{activeStudents} / {totalStudents}</p>
                  </div>
                  <span className="text-sm text-blue-600 dark:text-blue-400">{activeStudentsPercentage}%</span>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</p>
                    <p className="text-gray-900 dark:text-white">{completedAttempts} / {totalAttempts}</p>
                  </div>
                  <span className="text-sm text-green-600 dark:text-green-400">{completionRate}%</span>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Account Claims</p>
                    <p className="text-gray-900 dark:text-white">{claimedAccounts} / {claimedAccounts + unclaimedAccounts}</p>
                  </div>
                  <span className="text-sm text-purple-600 dark:text-purple-400">
                    {((claimedAccounts / (claimedAccounts + unclaimedAccounts)) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Distribution Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-gray-900 dark:text-white mb-4">User Distribution</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={userDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {userDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-gray-900 dark:text-white mb-4">Quiz Status</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={quizStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {quizStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-gray-900 dark:text-white mb-4">Account Status</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={accountStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {accountStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-gray-900 dark:text-white mb-4">System Activity Timeline</h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={activityTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="attempts" stackId="1" stroke="#3B82F6" fill="#3B82F6" name="Quiz Attempts" />
                  <Area type="monotone" dataKey="quizzes" stackId="2" stroke="#10B981" fill="#10B981" name="Quizzes Created" />
                  <Area type="monotone" dataKey="users" stackId="3" stroke="#8B5CF6" fill="#8B5CF6" name="Active Users" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Class Performance */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-gray-900 dark:text-white mb-4">Class Performance Overview</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={classPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="students" fill="#3B82F6" name="Students" />
                  <Bar dataKey="avgScore" fill="#10B981" name="Avg Score (%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* Engagement Tab */}
        {selectedView === 'engagement' && (
          <>
            {/* Most Active Classes */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-gray-900 dark:text-white mb-4">Most Active Classes</h2>
              <div className="space-y-4">
                {mostActiveClasses.map((cls, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                        <span className="text-blue-600 dark:text-blue-400">#{index + 1}</span>
                      </div>
                      <div>
                        <div className="text-gray-900 dark:text-white">{cls.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{cls.students} students</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-900 dark:text-white">{cls.attempts} attempts</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Avg: {cls.avgScore}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Teacher Activity */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6">
                <h2 className="text-gray-900 dark:text-white mb-4">Teacher Activity</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Teacher
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Quizzes
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Attempts
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Classes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {teacherActivity.map((teacher, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-900 dark:text-white">{teacher.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full text-sm">
                            {teacher.subject}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-900 dark:text-white">{teacher.quizzes}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-900 dark:text-white">{teacher.attempts}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-900 dark:text-white">{teacher.classes}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Performance Tab */}
        {selectedView === 'performance' && (
          <>
            {/* Top Performing Students */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6">
                <h2 className="text-gray-900 dark:text-white mb-4">Top Performing Students</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Class
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Attempts
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Avg Score
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {studentPerformance.map((student, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {index === 0 && <Award className="w-4 h-4 text-yellow-500" />}
                            {index === 1 && <Award className="w-4 h-4 text-gray-400" />}
                            {index === 2 && <Award className="w-4 h-4 text-orange-600" />}
                            <span className="text-gray-900 dark:text-white">#{index + 1}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-900 dark:text-white">{student.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                            {student.class}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-900 dark:text-white">{student.attempts}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-sm ${parseFloat(student.avgScore) >= 80
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                            : parseFloat(student.avgScore) >= 60
                              ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                              : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                            }`}>
                            {student.avgScore}%
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Performance Trends */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-gray-900 dark:text-white mb-4">Performance Trend (Last 6 Months)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={activityTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="attempts"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    name="Quiz Attempts"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 print:hidden">
          <h2 className="text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/admin/users"
              className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div>
                <div className="text-gray-900 dark:text-white">Manage Users</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Add or edit users</div>
              </div>
            </a>
            <a
              href="/admin/classes"
              className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
            >
              <Building className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              <div>
                <div className="text-gray-900 dark:text-white">Manage Classes</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Organize classes</div>
              </div>
            </a>
            <a
              href="/admin/quizzes"
              className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            >
              <FileText className="w-8 h-8 text-green-600 dark:text-green-400" />
              <div>
                <div className="text-gray-900 dark:text-white">View All Quizzes</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">System oversight</div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}