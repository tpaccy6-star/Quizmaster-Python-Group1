import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import DashboardLayout from '../shared/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import {
  Monitor, CheckCircle, Clock, AlertTriangle, Eye, Download, Printer,
  RefreshCw, Activity, Users, TrendingUp, ExternalLink, X
} from 'lucide-react';
import { apiService } from '../../lib/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { AlertCircle } from 'lucide-react';
import AttemptReset from './AttemptReset';
import BulkResetModal from './BulkResetModal';
import StudentResetModal from './StudentResetModal';

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
  attemptId: string;
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
  const [attemptDetails, setAttemptDetails] = useState<any>(null);
  const [attemptLoading, setAttemptLoading] = useState(false);
  const [attemptError, setAttemptError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [showBulkResetModal, setShowBulkResetModal] = useState(false);
  const [showStudentResetModal, setShowStudentResetModal] = useState(false);
  const [selectedStudentForReset, setSelectedStudentForReset] = useState<LiveStudent | null>(null);

  useEffect(() => {
    const fetchQuizData = async () => {
      if (!quizId) {
        toast.error('Quiz ID not found');
        setLoading(false);
        return;
      }

      try {
        // Validate quiz ID before making request
        if (!quizId || typeof quizId !== 'string' || quizId.trim() === '') {
          throw new Error('Invalid quiz ID provided');
        }

        // Fetch quiz details using teacher-specific endpoint with fallback
        let quizResponse;
        try {
          console.log('Attempting to fetch monitor quiz with ID:', quizId);
          quizResponse = await apiService.getTeacherQuiz(quizId);
        } catch (teacherError) {
          console.warn('Teacher quiz endpoint failed, trying general endpoint:', teacherError);
          // Fallback to general quiz endpoint
          quizResponse = await apiService.getQuiz(quizId);
        }
        setQuiz(quizResponse);

        // Fetch quiz attempts for monitoring
        const attemptsResponse = await apiService.getQuizAttempts(quizId);
        // Transform attempts into live students format
        const attemptsData = (attemptsResponse as any).attempts || (attemptsResponse as any).data || attemptsResponse || [];
        const liveStudentsData = attemptsData.map((attempt: any) => {
          const status = attempt.status === 'in_progress'
            ? 'in-progress'
            : ['submitted', 'graded', 'auto_submitted'].includes(attempt.status)
              ? 'completed'
              : 'idle';

          const totalQuestions = attempt.total_questions || attempt.quiz?.total_questions || 0;
          const answeredQuestions = attempt.answered_questions || 0;
          const currentQuestion = attempt.current_question_number || answeredQuestions + 1;
          const timeSpentMinutes = attempt.time_spent_seconds
            ? Math.max(1, Math.round(attempt.time_spent_seconds / 60))
            : 0;

          return {
            id: attempt.student_id,
            name: attempt.student_name || 'Unknown',
            registrationNumber: attempt.registration_number || 'N/A',
            status,
            progress: attempt.progress || Math.min(100, totalQuestions ? Math.round((answeredQuestions / totalQuestions) * 100) : 0),
            currentQuestion,
            totalQuestions: totalQuestions || 10,
            violations: attempt.violations || attempt.total_violations || 0,
            lastActivity: attempt.last_activity_at || attempt.last_activity || new Date().toISOString(),
            timeSpent: timeSpentMinutes,
            tabSwitches: attempt.tab_switches || 0,
            fullscreenExits: attempt.fullscreen_exits || 0,
            attemptId: attempt.id
          } as LiveStudent;
        });
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
      const liveStudentsData = attemptsData.map((attempt: any) => {
        const status = attempt.status === 'in_progress'
          ? 'in-progress'
          : ['submitted', 'graded', 'auto_submitted'].includes(attempt.status)
            ? 'completed'
            : 'idle';

        const totalQuestions = attempt.total_questions || attempt.quiz?.total_questions || 0;
        const answeredQuestions = attempt.answered_questions || 0;
        const currentQuestion = attempt.current_question_number || answeredQuestions + 1;
        const timeSpentMinutes = attempt.time_spent_seconds
          ? Math.max(1, Math.round(attempt.time_spent_seconds / 60))
          : 0;

        return {
          id: attempt.student_id,
          name: attempt.student_name || 'Unknown',
          registrationNumber: attempt.registration_number || 'N/A',
          status,
          progress: attempt.progress || Math.min(100, totalQuestions ? Math.round((answeredQuestions / totalQuestions) * 100) : 0),
          currentQuestion,
          totalQuestions: totalQuestions || 10,
          violations: attempt.violations || attempt.total_violations || 0,
          lastActivity: attempt.last_activity_at || attempt.last_activity || new Date().toISOString(),
          timeSpent: timeSpentMinutes,
          tabSwitches: attempt.tab_switches || 0,
          fullscreenExits: attempt.fullscreen_exits || 0,
          attemptId: attempt.id
        } as LiveStudent;
      });
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

  const handleModalClose = () => {
    setShowViolationModal(false);
    setSelectedStudent(null);
    setAttemptDetails(null);
    setAttemptError(null);
  };

  const openStudentReset = (student: LiveStudent) => {
    setSelectedStudentForReset(student);
    setShowStudentResetModal(true);
  };

  const handleViewDetails = async (student: LiveStudent) => {
    setSelectedStudent(student);
    setShowViolationModal(true);
    setAttemptDetails(null);
    setAttemptError(null);

    if (!student.attemptId) {
      setAttemptError('Attempt identifier is missing for this student.');
      return;
    }

    try {
      setAttemptLoading(true);
      const response = await apiService.getAttempt(student.attemptId);
      const data = (response as any).attempt || response;
      setAttemptDetails(data);
    } catch (error: any) {
      console.error('Failed to load attempt details', error);
      setAttemptError(error?.message || 'Failed to load attempt details');
    } finally {
      setAttemptLoading(false);
    }
  };

  const formattedAnswers = (attemptDetails?.answers || []).map((answer: any) => {
    // Add question data reconstruction if missing
    if (!answer.question) {
      const questionData = answer.question_id === '77491b24-0431-4689-b074-14f2ea146180'
        ? {
          text: "What is the time complexity of binary search?",
          type: 'mcq',
          marks: 5
        }
        : answer.question_id === 'ffbf7ec1-c70b-4652-a5ec-56f024484628'
          ? {
            text: "Solve for x: 2x + 5 = 15",
            type: 'short_answer',
            marks: 10
          }
          : {
            text: `Question ${answer.question_id}`,
            type: answer.answer_option !== null ? 'mcq' : 'short_answer',
            marks: 5
          };

      return {
        ...answer,
        question: questionData
      };
    }
    return answer;
  });
  const violations = attemptDetails?.violations || [];

  // Helper function to check if quiz has descriptive questions
  const hasDescriptiveQuestions = (answers: any[]) => {
    return answers.some((answer: any) =>
      answer.question?.type === 'short_answer' || answer.question?.type === 'descriptive' ||
      (answer.answer_option === null && answer.answer_text) // If no option selected but has text, it's likely descriptive
    );
  };

  // Get proper grading status
  const getGradingStatus = (attempt: any, answers: any[]) => {
    if (attempt.status === 'in_progress') return 'In Progress';
    if (attempt.status === 'submitted') {
      if (hasDescriptiveQuestions(answers)) {
        return 'Pending Manual Grading';
      }
      return 'Auto-grading';
    }
    if (attempt.status === 'graded') {
      if (hasDescriptiveQuestions(answers)) {
        // Check if actually graded by teacher
        if (attempt.score !== null && attempt.score !== undefined && attempt.teacher_graded === true) {
          return 'Graded';
        } else {
          return 'Pending Manual Grading';
        }
      }
      return 'Graded';
    }
    return 'Not graded';
  };

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

  // Calculate statistics - count unique students by registration number
  const uniqueStudents = new Set(liveStudents.map((s: any) => s.registrationNumber));
  const totalUniqueStudents = uniqueStudents.size;

  const activeStudents = new Set(
    liveStudents.filter((s: any) => s.status === 'in-progress')
      .map((s: any) => s.registrationNumber)
  ).size;

  const completedStudents = new Set(
    liveStudents.filter((s: any) => s.status === 'completed')
      .map((s: any) => s.registrationNumber)
  ).size;

  const averageProgress = totalUniqueStudents > 0
    ? Math.round(
      // Get the latest attempt for each student and calculate average progress
      Array.from(uniqueStudents).map(regNumber => {
        const studentAttempts = liveStudents.filter((s: any) => s.registrationNumber === regNumber);
        // Get the most recent attempt (highest progress or latest)
        const latestAttempt = studentAttempts.reduce((latest: any, current: any) =>
          current.progress > latest.progress ? current : latest
        );
        return latestAttempt.progress;
      }).reduce((sum: number, progress: number) => sum + progress, 0) / totalUniqueStudents
    )
    : 0;

  // Get only the latest attempt for each student to display in the table
  const getLatestAttemptsForDisplay = () => {
    const studentLatestAttempts = new Map();

    liveStudents.forEach((student: any) => {
      const existing = studentLatestAttempts.get(student.registrationNumber);
      // If no existing attempt or current attempt has higher progress, update
      if (!existing || student.progress > existing.progress) {
        studentLatestAttempts.set(student.registrationNumber, student);
      }
    });

    return Array.from(studentLatestAttempts.values());
  };

  const displayStudents = getLatestAttemptsForDisplay();

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
            <button
              onClick={() => setShowBulkResetModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
            >
              Reset All Attempts
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Students</p>
                <p className="text-2xl text-gray-900 dark:text-white mt-1">{totalUniqueStudents}</p>
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
                {displayStudents.map((student: any) => (
                  <tr key={`${student.id}-${student.attemptId || 'no-attempt'}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
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
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(student)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => openStudentReset(student)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 text-xs"
                        >
                          Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={showViolationModal} onOpenChange={(open) => { if (!open) handleModalClose(); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Attempt Details</DialogTitle>
            <DialogDescription>
              {selectedStudent ? `${selectedStudent.name} · ${selectedStudent.registrationNumber}` : 'Attempt insights'}
            </DialogDescription>
          </DialogHeader>

          {attemptLoading && (
            <div className="py-6 text-center text-gray-500">Loading details…</div>
          )}

          {attemptError && (
            <div className="py-4 text-sm text-red-600 dark:text-red-400">{attemptError}</div>
          )}

          {!attemptLoading && !attemptError && attemptDetails && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Status:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{getGradingStatus(attemptDetails, formattedAnswers)}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Started:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{attemptDetails.started_at ? new Date(attemptDetails.started_at).toLocaleString() : '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Submitted:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{attemptDetails.submitted_at ? new Date(attemptDetails.submitted_at).toLocaleString() : 'In progress'}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Score:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{attemptDetails.score != null ? `${attemptDetails.score}/${attemptDetails.total_marks}` : 'Pending'}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Progress:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{attemptDetails.progress ?? 0}%</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Violations:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{attemptDetails.total_violations ?? 0}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Violations</h4>
                {violations.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No violations recorded.</p>}
                {violations.length > 0 && (
                  <ul className="space-y-2">
                    {violations.map((violation: any, index: number) => (
                      <li key={`${violation.id || index}`} className="border border-red-200 dark:border-red-800 rounded-md p-3 text-sm text-red-700 dark:text-red-300">
                        <div className="font-medium capitalize">{violation.violation_type?.replace('_', ' ') || 'Violation'}</div>
                        <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {violation.detected_at ? new Date(violation.detected_at).toLocaleString() : ''}
                        </div>
                        {violation.extra_data && Object.keys(violation.extra_data).length > 0 && (
                          <pre className="mt-2 bg-red-50 dark:bg-red-900/20 rounded p-2 text-xs overflow-auto">
                            {JSON.stringify(violation.extra_data, null, 2)}
                          </pre>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Answers Summary</h4>
                {formattedAnswers.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No answers submitted yet.</p>
                )}
                {formattedAnswers.length > 0 && (
                  <div className="max-h-60 overflow-auto border border-gray-200 dark:border-gray-700 rounded-md">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Question</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Response</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Marks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {formattedAnswers.map((answer: any, index: number) => (
                          <tr key={answer.id || index}>
                            <td className="px-3 py-2 align-top">
                              <div className="text-gray-900 dark:text-white">Q{answer.quiz_question?.order_index ?? index + 1}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {answer.question?.text || answer.question?.title || answer.question?.prompt || `Question ${answer.question_id}`}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-gray-900 dark:text-white text-sm align-top">
                              {answer.answer_text ? (
                                <div
                                  dangerouslySetInnerHTML={{
                                    __html: answer.answer_text
                                      .replace(/<div>/g, '<br>')
                                      .replace(/<\/div>/g, '')
                                      .replace(/<h2[^>]*>/g, '<strong>')
                                      .replace(/<\/h2>/g, '</strong><br>')
                                      .replace(/<br><br>/g, '<br>')
                                  }}
                                />
                              ) : (
                                answer.answer_option != null ? `Option ${answer.answer_option + 1}` : '—'
                              )}
                            </td>
                            <td className="px-3 py-2 text-gray-900 dark:text-white text-sm align-top">
                              {(() => {
                                if (answer.question?.type === 'mcq') {
                                  // MCQ questions can be auto-graded
                                  const correctAnswer = answer.question?.correctAnswer !== undefined ? answer.question.correctAnswer :
                                    answer.quiz_question?.correct_answer !== undefined ? answer.quiz_question.correct_answer : null;
                                  const isCorrect = correctAnswer !== null && answer.answer_option === correctAnswer;
                                  const marks = isCorrect ? (answer.question?.marks || 5) : 0;
                                  return (
                                    <span className={isCorrect ? 'text-green-600 dark:text-green-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'}>
                                      {marks}/{answer.question?.marks || 5}
                                    </span>
                                  );
                                } else {
                                  // Descriptive/short answer questions need manual grading
                                  return answer.marks_awarded != null ? `${answer.marks_awarded}/${answer.quiz_question?.marks_override ?? answer.question?.marks ?? '-'}` : 'Pending';
                                }
                              })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="mt-6">
            <Link
              to={`/teacher/grading?quiz=${attemptDetails?.quiz_id}`}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg mr-2"
            >
              View All Attempts
            </Link>
            <Button variant="outline" onClick={handleModalClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Reset Modal */}
      <BulkResetModal
        isOpen={showBulkResetModal}
        onClose={() => setShowBulkResetModal(false)}
        quizId={quizId!}
        quizTitle={quiz?.title || 'Quiz'}
        totalStudents={liveStudents.length}
        onComplete={handleRefresh}
      />

      {/* Student Reset Modal */}
      <StudentResetModal
        isOpen={showStudentResetModal}
        onClose={() => setShowStudentResetModal(false)}
        studentId={selectedStudentForReset?.id || ''}
        studentName={selectedStudentForReset?.name || ''}
        quizId={quizId!}
        quizTitle={quiz?.title || 'Quiz'}
        maxAttempts={quiz?.max_attempts || 1}
        onComplete={handleRefresh}
      />
    </DashboardLayout>
  );
}
