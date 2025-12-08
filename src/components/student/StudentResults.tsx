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

  const [attempts, setAttempts] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch student's quiz attempts
        const attemptsResponse = await apiService.getStudentAttempts(user.id);
        if (attemptsResponse.data && Array.isArray(attemptsResponse.data)) {
          setAttempts(attemptsResponse.data);
        }

        // Fetch quizzes for details
        const quizzesResponse = await apiService.getQuizzes();
        if (quizzesResponse.data && Array.isArray(quizzesResponse.data)) {
          setQuizzes(quizzesResponse.data);
        }
      } catch (error) {
        toast.error('Failed to load results');
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

  // Filter attempts for current student (should already be filtered by API)
  const studentAttempts = attempts;

  const getQuizTitle = (quizId: string) => {
    return quizzes.find(q => q.id === quizId)?.title || 'Unknown Quiz';
  };

  const handleExportCSV = () => {
    const csvData = [
      ['My Quiz Results Report'],
      ['Student:', user.name],
      ['Generated:', new Date().toLocaleString()],
      [''],
      ['Quiz Title', 'Score', 'Total Marks', 'Percentage (%)', 'Status', 'Violations', 'Submitted At'],
      ...studentAttempts.map(attempt => {
        const percentage = Math.round((attempt.score / attempt.totalMarks) * 100);
        return [
          getQuizTitle(attempt.quizId),
          attempt.score.toString(),
          attempt.totalMarks.toString(),
          percentage.toString(),
          attempt.status,
          attempt.violations.toString(),
          new Date(attempt.submittedAt).toLocaleString()
        ];
      }),
      [''],
      ['Summary'],
      ['Total Quizzes Taken:', studentAttempts.length.toString()],
      ['Graded:', studentAttempts.filter(a => a.status === 'graded').length.toString()],
      ['Pending:', studentAttempts.filter(a => a.status === 'pending').length.toString()],
      ['Average Score:', studentAttempts.length > 0
        ? (studentAttempts.reduce((sum, a) => sum + (a.score / a.totalMarks) * 100, 0) / studentAttempts.length).toFixed(1) + '%'
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
              const percentage = Math.round((attempt.score / attempt.totalMarks) * 100);
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
                          {getQuizTitle(attempt.quizId)}
                        </h2>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(attempt.submittedAt).toLocaleString()}</span>
                        </div>
                        {attempt.violations > 0 && (
                          <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                            <AlertCircle className="w-4 h-4" />
                            <span>{attempt.violations} violation(s)</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl text-gray-900 dark:text-white mb-1">
                        {percentage}%
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {attempt.score}/{attempt.totalMarks} marks
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div>
                      {attempt.status === 'graded' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full text-sm">
                          <CheckCircle className="w-4 h-4" />
                          Graded
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-full text-sm">
                          <Clock className="w-4 h-4" />
                          Pending Review
                        </span>
                      )}
                    </div>
                    {attempt.status === 'graded' && (
                      <Link
                        to={`/student/result/${attempt.id}`}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </Link>
                    )}
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