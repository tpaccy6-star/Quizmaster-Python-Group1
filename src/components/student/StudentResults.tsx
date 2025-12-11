import { useState, useEffect } from 'react';
import DashboardLayout from '../shared/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Clock, CheckCircle, AlertCircle, Eye, Download, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiService } from '../../lib/api';
import { toast } from 'sonner';

export default function StudentResults() {
  const { currentUser: user, logout } = useAuth();

  if (!user) {
    return <div>Loading...</div>;
  }

  // Format date helper function
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not submitted';

    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) return 'Invalid date';

      // Convert to Rwanda timezone (UTC+2)
      const rwandaTime = new Date(date.getTime() + (2 * 60 * 60 * 1000)); // Add 2 hours

      // Format: "Dec 10, 2025 at 2:46 PM"
      return rwandaTime.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).replace(',', ' at');
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Date error';
    }
  };

  // Check if quiz has descriptive questions that need manual grading
  const hasDescriptiveQuestions = (quiz: any) => {
    if (!quiz || !quiz.questions) return false;
    return quiz.questions.some((q: any) => q.type === 'short_answer' || q.type === 'descriptive');
  };

  // Get grading status based on quiz type and attempt status
  const getGradingStatus = (attempt: any, quiz: any) => {
    console.log('getGradingStatus - attempt:', attempt.status, 'quiz:', quiz);

    // Create quiz with questions if needed
    let quizWithQuestions = quiz;
    if (!quiz?.questions || quiz.questions.length === 0) {
      // Reconstruct questions from attempt answers
      quizWithQuestions = {
        ...quiz,
        questions: attempt.answers.map((answer: any) => ({
          id: answer.question_id,
          type: answer.answer_option !== null ? 'mcq' : 'short_answer'
        }))
      };
    }

    console.log('getGradingStatus - hasDescriptiveQuestions:', hasDescriptiveQuestions(quizWithQuestions));

    if (attempt.status === 'in_progress') return { status: 'In Progress', color: 'blue' as const };
    if (attempt.status === 'submitted') {
      if (hasDescriptiveQuestions(quizWithQuestions)) {
        return { status: 'Pending Manual Grading', color: 'yellow' as const };
      }
      return { status: 'Auto-grading', color: 'blue' as const };
    }
    // Only show as "Graded" if there are no descriptive questions OR if score is manually set by teacher
    if (attempt.status === 'graded') {
      if (hasDescriptiveQuestions(quizWithQuestions)) {
        // Check if score was manually set by teacher (not auto-graded)
        if (attempt.score !== null && attempt.score !== undefined && attempt.teacher_graded === true) {
          return { status: 'Graded', color: 'green' as const };
        } else {
          return { status: 'Pending Manual Grading', color: 'yellow' as const };
        }
      }
      return { status: 'Graded', color: 'green' as const };
    }
    return { status: 'Not graded', color: 'gray' as const };
  };

  // Helper function to get quiz by ID
  const getQuizById = (quizId: string) => {
    return quizzes.find(quiz => quiz.id === quizId);
  };

  const [attempts, setAttempts] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('StudentResults - Starting data fetch for user:', user.id);

        // Fetch student's quiz attempts
        console.log('StudentResults - Fetching attempts...');
        const attemptsResponse = await apiService.getStudentAttempts(user.id);
        console.log('StudentResults - Attempts response:', attemptsResponse);
        console.log('StudentResults - Attempts response.data:', attemptsResponse.data);
        console.log('StudentResults - Attempts response type:', typeof attemptsResponse);

        if (attemptsResponse.data && Array.isArray(attemptsResponse.data)) {
          setAttempts(attemptsResponse.data);
          console.log('StudentResults - Set attempts:', attemptsResponse.data.length);
        } else if ((attemptsResponse as any).items && Array.isArray((attemptsResponse as any).items)) {
          // Handle paginated response
          setAttempts((attemptsResponse as any).items);
          console.log('StudentResults - Set attempts from paginated response:', (attemptsResponse as any).items.length);
        } else if ((attemptsResponse as any).attempts && Array.isArray((attemptsResponse as any).attempts)) {
          // Handle backend response structure
          setAttempts((attemptsResponse as any).attempts);
          console.log('StudentResults - Set attempts from backend response:', (attemptsResponse as any).attempts.length);
          console.log('StudentResults - Sample attempt data:', JSON.stringify((attemptsResponse as any).attempts[0], null, 2));
        } else {
          console.warn('StudentResults - Unexpected attempts data structure:', attemptsResponse);
        }

        // Fetch quizzes for details
        console.log('StudentResults - Fetching quizzes...');
        const quizzesResponse = await apiService.getQuizzes();
        console.log('StudentResults - Quizzes response:', quizzesResponse);
        console.log('StudentResults - Quizzes response.data:', quizzesResponse.data);
        console.log('StudentResults - Quizzes response type:', typeof quizzesResponse);

        if (quizzesResponse.data && Array.isArray(quizzesResponse.data)) {
          setQuizzes(quizzesResponse.data);
          console.log('StudentResults - Set quizzes:', quizzesResponse.data.length);
        } else if ((quizzesResponse as any).items && Array.isArray((quizzesResponse as any).items)) {
          // Handle paginated response
          setQuizzes((quizzesResponse as any).items);
          console.log('StudentResults - Set quizzes from paginated response:', (quizzesResponse as any).items.length);
        } else if ((quizzesResponse as any).quizzes && Array.isArray((quizzesResponse as any).quizzes)) {
          // Handle backend response structure
          setQuizzes((quizzesResponse as any).quizzes);
          console.log('StudentResults - Set quizzes from backend response:', (quizzesResponse as any).quizzes.length);
          console.log('StudentResults - Sample quiz data:', JSON.stringify((quizzesResponse as any).quizzes[0], null, 2));
        } else {
          console.warn('StudentResults - Unexpected quizzes data structure:', quizzesResponse);
        }
      } catch (error) {
        console.error('StudentResults - Error loading data:', error);
        console.error('StudentResults - User ID:', user.id);
        console.error('StudentResults - Access token exists:', !!localStorage.getItem('accessToken'));

        if (error instanceof Error) {
          if (error.message.includes('Session expired')) {
            toast.error('Session expired. Please login again.');
          } else if (error.message.includes('Invalid token')) {
            toast.error('Authentication error. Please login again.');
          } else {
            toast.error(`Failed to load results: ${error.message}`);
          }
        } else {
          toast.error('Failed to load results');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout user={user} onLogout={logout}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Filter attempts for current student and show only latest attempt per quiz
  const studentAttempts = attempts.reduce((latest: any[], attempt) => {
    const existingIndex = latest.findIndex(a => a.quiz_id === attempt.quiz_id || a.quizId === attempt.quizId);
    if (existingIndex === -1) {
      latest.push(attempt);
    } else {
      // Keep the most recent attempt (by submitted_at or created_at)
      const existing = latest[existingIndex];
      const existingDate = new Date(existing.submitted_at || existing.submittedAt || existing.created_at || existing.createdAt);
      const attemptDate = new Date(attempt.submitted_at || attempt.submittedAt || attempt.created_at || attempt.createdAt);
      if (attemptDate > existingDate) {
        latest[existingIndex] = attempt;
      }
    }
    return latest;
  }, []);

  const getQuizTitle = (quizId: string) => {
    const quiz = quizzes.find(q => q.id === quizId);
    console.log('StudentResults - getQuizTitle:', JSON.stringify({ quizId, quiz, quizzesLength: quizzes.length }, null, 2));
    return quiz?.title || 'Unknown Quiz';
  };

  const handleExportCSV = () => {
    const csvData = [
      ['My Quiz Results Report'],
      ['Student:', user.name],
      ['Generated:', new Date().toLocaleString()],
      [''],
      ['Quiz Title', 'Score', 'Total Marks', 'Percentage (%)', 'Status', 'Violations', 'Submitted At'],
      ...studentAttempts.map(attempt => {
        // Handle backend field names for CSV export
        const score = attempt.score ?? null;
        const totalMarks = attempt.total_marks || attempt.totalMarks || 0;
        let percentage: number | null = 0;
        if (score !== null && score !== undefined && totalMarks > 0) {
          percentage = Math.round((score / totalMarks) * 100);
        } else if (attempt.status !== 'graded' && (score === null || score === undefined)) {
          percentage = null; // No percentage for in-progress attempts without scores
        }
        const submittedAt = attempt.submitted_at || attempt.submittedAt;
        const violations = attempt.total_violations || attempt.violations || 0;
        const quizId = attempt.quiz_id || attempt.quizId;

        return [
          getQuizTitle(quizId),
          score !== null && score !== undefined ? score.toString() : 'Not graded',
          totalMarks.toString(),
          percentage !== null ? percentage.toString() : 'N/A',
          attempt.status,
          violations.toString(),
          submittedAt ? new Date(submittedAt).toLocaleString() : 'Not submitted'
        ];
      }),
      [''],
      ['Summary'],
      ['Total Quizzes Taken:', studentAttempts.length.toString()],
      ['Graded:', studentAttempts.filter(a => a.status === 'graded').length.toString()],
      ['In Progress:', studentAttempts.filter(a => a.status === 'in_progress').length.toString()],
      ['Pending:', studentAttempts.filter(a => a.status === 'pending').length.toString()],
      ['Average Score:', studentAttempts.length > 0
        ? (studentAttempts.reduce((sum, a) => {
          const s = a.score ?? null;
          const tm = a.total_marks || a.totalMarks || 0;
          if (s !== null && s !== undefined && tm > 0) {
            return sum + (s / tm) * 100;
          }
          return sum;
        }, 0) / studentAttempts.filter(a => a.score !== null && a.score !== undefined).length || 0).toFixed(1) + '%'
        : 'N/A'
      ],
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-quiz-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Results exported as CSV');
  };

  const handlePrint = () => {
    window.print();
    toast.success('Print dialog opened');
  };

  return (
    <DashboardLayout user={user} onLogout={logout}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl text-gray-900 dark:text-white">My Results</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              View your quiz scores and feedback
            </p>
          </div>
          {studentAttempts.length > 0 && (
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
            </div>
          )}
        </div>

        {studentAttempts.length > 0 ? (
          <div className="grid gap-6">
            {studentAttempts.map((attempt) => {
              console.log('StudentResults - Processing attempt:', JSON.stringify(attempt, null, 2));
              // Handle backend field names
              const score = attempt.score ?? null;
              const totalMarks = attempt.total_marks || attempt.totalMarks || 0;

              // Calculate percentage only for graded attempts or attempts with valid scores
              let percentage: number | null = 0;
              if (score !== null && score !== undefined && totalMarks > 0) {
                percentage = Math.round((score / totalMarks) * 100);
              } else if (attempt.status !== 'graded' && (score === null || score === undefined)) {
                percentage = null; // No percentage for in-progress attempts without scores
              }

              const submittedAt = attempt.submitted_at || attempt.submittedAt;
              const violations = attempt.total_violations || attempt.violations || 0;
              const quizId = attempt.quiz_id || attempt.quizId;

              console.log('StudentResults - Calculating percentage:', JSON.stringify({ score, totalMarks, percentage, quizId }, null, 2));
              return (
                <div
                  key={attempt.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <h2 className="text-lg text-gray-900 dark:text-white">
                          {getQuizTitle(quizId)}
                        </h2>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate(submittedAt)}</span>
                        </div>
                        {violations > 0 && (
                          <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                            <AlertCircle className="w-4 h-4" />
                            <span>{violations} violation(s)</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl text-gray-900 dark:text-white mb-1">
                        {(() => {
                          const gradingStatus = getGradingStatus(attempt, getQuizById(quizId));
                          if (gradingStatus.status === 'Graded' && percentage !== null) {
                            return `${percentage}%`;
                          } else if (gradingStatus.status === 'Pending Manual Grading') {
                            return 'Pending';
                          } else {
                            return 'N/A';
                          }
                        })()}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {(() => {
                          const gradingStatus = getGradingStatus(attempt, getQuizById(quizId));
                          if (gradingStatus.status === 'Graded' && score !== null && score !== undefined) {
                            return `${score}/${totalMarks} marks`;
                          } else if (gradingStatus.status === 'Pending Manual Grading') {
                            return 'Manual grading';
                          } else {
                            return gradingStatus.status;
                          }
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div>
                      {(() => {
                        const gradingStatus = getGradingStatus(attempt, getQuizById(quizId));
                        const colorClasses = {
                          green: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
                          blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
                          yellow: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
                          gray: 'bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400'
                        };

                        return (
                          <span className={`inline-flex items-center gap-1 px-3 py-1 ${colorClasses[gradingStatus.color]} rounded-full text-sm`}>
                            {gradingStatus.color === 'green' && <CheckCircle className="w-4 h-4" />}
                            {gradingStatus.color === 'blue' && <Clock className="w-4 h-4" />}
                            {gradingStatus.color === 'yellow' && <AlertCircle className="w-4 h-4" />}
                            {gradingStatus.color === 'gray' && <AlertCircle className="w-4 h-4" />}
                            {gradingStatus.status}
                          </span>
                        );
                      })()}
                    </div>
                    <Link
                      to={`/student/result/${attempt.id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
            <FileText className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl text-gray-900 dark:text-white mb-2">No Results Yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You haven&apos;t taken any quizzes yet
            </p>
            <Link
              to="/student/quiz-access"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Clock className="w-5 h-5" />
              Take a Quiz
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}