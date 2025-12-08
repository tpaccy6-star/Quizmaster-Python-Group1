import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import DashboardLayout from '../shared/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import {
  Monitor, CheckCircle, Clock, AlertTriangle, Eye, Download, Printer,
  RefreshCw, Activity, Users, TrendingUp, ExternalLink, X
} from 'lucide-react';
import { apiService } from '../../lib/api';
import { toast } from 'sonner';

interface LiveStudent {
  id: string;
  name: string;
  registrationNumber: string;
  status: 'in-progress' | 'completed' | 'idle';
  progress: number;
  currentQuestion: number;
  totalQuestions: number;
  violations: number;
  lastActivity: string;
  timeSpent: number; // in minutes
  tabSwitches: number;
  fullscreenExits: number;
}

export default function QuizMonitor() {
  const { currentUser: user, logout: onLogout } = useAuth();
  const { quizId } = useParams<{ quizId: string }>();
  const [quiz, setQuiz] = useState<any>(null);
  const [liveStudents, setLiveStudents] = useState<LiveStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<LiveStudent | null>(null);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchQuizData = async () => {
      if (!quizId) {
        toast.error('Quiz ID not found');
        setLoading(false);
        return;
      }

      try {
        // Fetch quiz details
        const quizResponse = await apiService.getQuiz(quizId);
        setQuiz(quizResponse);

        // Fetch quiz attempts for monitoring
        const attemptsResponse = await apiService.getQuizAttempts(quizId);
        // Transform attempts into live students format
        const attemptsData = (attemptsResponse as any).attempts || (attemptsResponse as any).data || attemptsResponse || [];
        const liveStudentsData = attemptsData.map((attempt: any) => ({
          id: attempt.student_id,
          name: attempt.student_name || 'Unknown',
          registrationNumber: attempt.registration_number || 'N/A',
          status: attempt.status === 'in_progress' ? 'in-progress' :
            attempt.status === 'completed' ? 'completed' : 'idle',
          progress: attempt.progress || 0,
          currentQuestion: attempt.current_question || 1,
          totalQuestions: attempt.total_questions || 10,
          violations: attempt.violations || 0,
          lastActivity: attempt.last_activity || new Date().toISOString(),
          timeSpent: attempt.time_spent || 0,
          tabSwitches: attempt.tab_switches || 0,
          fullscreenExits: attempt.fullscreen_exits || 0
        }));
        setLiveStudents(liveStudentsData);
      } catch (error) {
        console.error('Failed to fetch quiz data:', error);
        toast.error('Failed to load quiz data');
      } finally {
        setLoading(false);
      }
    };

    fetchQuizData();
  }, [quizId]);

  // Refresh data
  const handleRefresh = async () => {
    if (!quizId) return;

    setIsRefreshing(true);
    try {
      const attemptsResponse = await apiService.getQuizAttempts(quizId);
      const attemptsData = (attemptsResponse as any).attempts || (attemptsResponse as any).data || attemptsResponse || [];
      const liveStudentsData = attemptsData.map((attempt: any) => ({
        id: attempt.student_id,
        name: attempt.student_name || 'Unknown',
        registrationNumber: attempt.registration_number || 'N/A',
        status: attempt.status === 'in_progress' ? 'in-progress' :
          attempt.status === 'completed' ? 'completed' : 'idle',
        progress: attempt.progress || 0,
        currentQuestion: attempt.current_question || 1,
        totalQuestions: attempt.total_questions || 10,
        violations: attempt.violations || 0,
        lastActivity: attempt.last_activity || new Date().toISOString(),
        timeSpent: attempt.time_spent || 0,
        tabSwitches: attempt.tab_switches || 0,
        fullscreenExits: attempt.fullscreen_exits || 0
      }));
      setLiveStudents(liveStudentsData);
      toast.success('Data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      handleRefresh();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, quizId, handleRefresh]);

  if (loading) {
    return (
      <DashboardLayout user={user!} onLogout={onLogout}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!quiz) {
    return (
      <DashboardLayout user={user!} onLogout={onLogout}>
        <div className="text-center py-12">
          <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg text-gray-900 dark:text-white mb-2">Quiz not found</h2>
          <p className="text-gray-600 dark:text-gray-400">The requested quiz could not be found.</p>
        </div>
      </DashboardLayout>
    );
  }

  // Calculate statistics
  const activeStudents = liveStudents.filter((s: any) => s.status === 'in-progress').length;
  const completedStudents = liveStudents.filter((s: any) => s.status === 'completed').length;
  const averageProgress = liveStudents.length > 0
    ? Math.round(liveStudents.reduce((sum: any, s: any) => sum + s.progress, 0) / liveStudents.length)
    : 0;

  return (
    <DashboardLayout user={user!} onLogout={onLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl text-gray-900 dark:text-white">Quiz Monitor</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Monitor live quiz: {quiz?.title || 'Loading...'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${autoRefresh
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
            >
              <Activity className="w-4 h-4" />
              Auto-refresh: {autoRefresh ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Students</p>
                <p className="text-2xl text-gray-900 dark:text-white mt-1">{liveStudents.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Now</p>
                <p className="text-2xl text-green-600 dark:text-green-400 mt-1">{activeStudents}</p>
              </div>
              <Activity className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-2xl text-blue-600 dark:text-blue-400 mt-1">{completedStudents}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Progress</p>
                <p className="text-2xl text-purple-600 dark:text-purple-400 mt-1">{averageProgress}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg text-gray-900 dark:text-white">Live Students</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Question</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Violations</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {liveStudents.map((student: any) => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{student.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{student.registrationNumber}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${student.status === 'completed' ? 'bg-green-100 text-green-800' :
                        student.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                        {student.status === 'completed' ? 'Completed' :
                          student.status === 'in-progress' ? 'In Progress' : 'Idle'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${student.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-900 dark:text-white">{student.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {student.currentQuestion} / {student.totalQuestions}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {student.timeSpent}m
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {student.violations > 0 ? (
                        <span className="text-red-600 dark:text-red-400 font-medium">{student.violations}</span>
                      ) : (
                        <span className="text-green-600 dark:text-green-400">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => {
                          setSelectedStudent(student);
                          setShowViolationModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
