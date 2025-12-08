import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import DashboardLayout from '../shared/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { apiService } from '../../lib/api';
import {
  Download, Printer, TrendingUp, TrendingDown, Users, Clock,
  Target, Award, AlertCircle, CheckCircle, XCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function QuizAnalytics() {
  const { currentUser: user, logout } = useAuth();
  const { quizId } = useParams<{ quizId: string }>();
  const [selectedView, setSelectedView] = useState<'overview' | 'questions' | 'students'>('overview');
  const [quiz, setQuiz] = useState<any>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (!quizId) {
        toast.error('Quiz ID not found');
        setLoading(false);
        return;
      }

      try {
        // Fetch quiz details
        const quizResponse = await apiService.getQuiz(quizId);
        setQuiz(quizResponse);

        // Fetch quiz attempts for analytics
        const attemptsResponse = await apiService.getQuizAttempts(quizId);
        setAttempts(Array.isArray(attemptsResponse) ? attemptsResponse : []);
      } catch (error) {
        console.error('Failed to fetch analytics data:', error);
        toast.error('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [quizId]);

  if (loading) {
    return (
      <DashboardLayout user={user!} onLogout={logout}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!quiz) {
    return (
      <DashboardLayout user={user!} onLogout={logout}>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg text-gray-900 dark:text-white mb-2">Quiz not found</h2>
          <p className="text-gray-600 dark:text-gray-400">The requested quiz could not be found.</p>
        </div>
      </DashboardLayout>
    );
  }

  // Calculate statistics
  const totalAttempts = attempts.length;
  const completedAttempts = attempts.filter((a: any) => a.status === 'graded').length;
  const averageScore = totalAttempts > 0
    ? (attempts.reduce((sum: any, a: any) => sum + (a.score / a.total_marks) * 100, 0) / totalAttempts).toFixed(1)
    : 0;
  const highestScore = totalAttempts > 0
    ? Math.max(...attempts.map((a: any) => (a.score / a.total_marks) * 100)).toFixed(1)
    : 0;
  const lowestScore = totalAttempts > 0
    ? Math.min(...attempts.map((a: any) => (a.score / a.total_marks) * 100)).toFixed(1)
    : 0;
  const totalViolations = attempts.reduce((sum: any, a: any) => sum + (a.violations || 0), 0);
  const passingScore = 40; // Default passing percentage
  const passRate = totalAttempts > 0
    ? ((attempts.filter((a: any) => (a.score / a.total_marks) * 100 >= passingScore).length / totalAttempts) * 100).toFixed(1)
    : 0;

  // Per-question analysis
  const questionAnalysis = (quiz.questions || []).map((question: any, index: any) => {
    const questionId = question.id;
    const totalResponses = attempts.length;

    let correctCount = 0;
    let averageMarks = 0;
    const answerDistribution: { [key: string]: number } = {};

    attempts.forEach((attempt: any) => {
      const answer = (attempt.answers || []).find((a: any) => a.question_id === questionId);
      if (answer) {
        if (question.type === 'mcq' && question.correct_answer !== undefined) {
          if (answer.answer === question.correct_answer) {
            correctCount++;
          }
          // Track answer distribution for MCQ
          const answerKey = `Option ${Number(answer.answer) + 1}`;
          answerDistribution[answerKey] = (answerDistribution[answerKey] || 0) + 1;
        } else if (question.type === 'descriptive' && answer.marksAwarded !== undefined) {
          averageMarks += answer.marksAwarded;
        }
      }
    });

    const successRate = question.type === 'mcq'
      ? totalResponses > 0 ? (correctCount / totalResponses) * 100 : 0
      : totalResponses > 0 ? (averageMarks / totalResponses / question.marks) * 100 : 0;

    return {
      questionNumber: index + 1,
      text: question.text,
      type: question.type,
      difficulty: question.difficulty,
      marks: question.marks,
      successRate: successRate.toFixed(1),
      correctCount,
      totalResponses,
      averageMarks: question.type === 'descriptive' ? (averageMarks / totalResponses).toFixed(1) : undefined,
      answerDistribution: question.type === 'mcq' ? answerDistribution : undefined,
    };
  });

  // Score distribution for chart
  const scoreDistribution = [
    { range: '0-20%', count: attempts.filter((a: any) => (a.score / a.total_marks) * 100 < 20).length },
    {
      range: '20-40%', count: attempts.filter((a: any) => {
        const pct = (a.score / a.total_marks) * 100;
        return pct >= 20 && pct < 40;
      }).length
    },
    {
      range: '40-60%', count: attempts.filter((a: any) => {
        const pct = (a.score / a.total_marks) * 100;
        return pct >= 40 && pct < 60;
      }).length
    },
    {
      range: '60-80%', count: attempts.filter((a: any) => {
        const pct = (a.score / a.total_marks) * 100;
        return pct >= 60 && pct < 80;
      }).length
    },
    { range: '80-100%', count: attempts.filter((a: any) => (a.score / a.total_marks) * 100 >= 80).length },
  ];

  // Question performance for chart
  const questionPerformanceData = questionAnalysis.map((q: any) => ({
    question: `Q${q.questionNumber}`,
    successRate: parseFloat(q.successRate),
    difficulty: q.difficulty,
  }));

  // Difficulty vs Performance
  const difficultyData = [
    {
      difficulty: 'Easy',
      avgSuccess: questionAnalysis
        .filter((q: any) => q.difficulty === 'easy')
        .reduce((sum: any, q: any) => sum + parseFloat(q.successRate), 0) /
        questionAnalysis.filter((q: any) => q.difficulty === 'easy').length || 0
    },
    {
      difficulty: 'Medium',
      avgSuccess: questionAnalysis
        .filter((q: any) => q.difficulty === 'medium')
        .reduce((sum: any, q: any) => sum + parseFloat(q.successRate), 0) /
        questionAnalysis.filter((q: any) => q.difficulty === 'medium').length || 0
    },
    {
      difficulty: 'Hard',
      avgSuccess: questionAnalysis
        .filter((q: any) => q.difficulty === 'hard')
        .reduce((sum: any, q: any) => sum + parseFloat(q.successRate), 0) /
        questionAnalysis.filter((q: any) => q.difficulty === 'hard').length || 0
    },
  ];

  // Student performance data
  const studentPerformanceData = attempts.map((attempt: any) => {
    return {
      studentName: attempt.student_name || 'Unknown',
      score: (attempt.score / attempt.total_marks) * 100,
      violations: attempt.violations || 0,
      status: attempt.status,
    };
  }).sort((a, b) => b.score - a.score);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const handleExportCSV = () => {
    const csvData = [
      ['Quiz Analytics Report'],
      ['Quiz Title:', quiz.title],
      ['Subject:', quiz.subject],
      ['Total Attempts:', totalAttempts.toString()],
      ['Average Score:', `${averageScore}%`],
      ['Pass Rate:', `${passRate}%`],
      [''],
      ['Student Performance'],
      ['Student Name', 'Score (%)', 'Violations', 'Status'],
      ...studentPerformanceData.map(s => [s.studentName, s.score.toFixed(1), s.violations.toString(), s.status]),
      [''],
      ['Question Analysis'],
      ['Question', 'Type', 'Difficulty', 'Success Rate (%)', 'Total Responses'],
      ...questionAnalysis.map(q => [
        `Q${q.questionNumber}: ${q.text}`,
        q.type,
        q.difficulty,
        q.successRate,
        q.totalResponses.toString()
      ]),
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz-analytics-${quiz.id}.csv`;
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
            <h1 className="text-gray-900 dark:text-white">{quiz.title} - Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{quiz.subject}</p>
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
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
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
            Overview
          </button>
          <button
            onClick={() => setSelectedView('questions')}
            className={`px-4 py-2 border-b-2 transition-colors ${selectedView === 'questions'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
          >
            Per-Question Analysis
          </button>
          <button
            onClick={() => setSelectedView('students')}
            className={`px-4 py-2 border-b-2 transition-colors ${selectedView === 'students'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
          >
            Student Performance
          </button>
        </div>

        {/* Overview Tab */}
        {selectedView === 'overview' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Attempts</div>
                    <div className="text-gray-900 dark:text-white mt-2">{totalAttempts}</div>
                  </div>
                  <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Average Score</div>
                    <div className="text-gray-900 dark:text-white mt-2">{averageScore}%</div>
                  </div>
                  <Target className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Pass Rate</div>
                    <div className="text-gray-900 dark:text-white mt-2">{passRate}%</div>
                  </div>
                  <Award className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Violations</div>
                    <div className="text-gray-900 dark:text-white mt-2">{totalViolations}</div>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Highest Score</div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="text-gray-900 dark:text-white">{highestScore}%</span>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Lowest Score</div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  <span className="text-gray-900 dark:text-white">{lowestScore}%</span>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Completion Rate</div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-900 dark:text-white">
                    {totalAttempts > 0 ? ((completedAttempts / totalAttempts) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Score Distribution Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-gray-900 dark:text-white mb-4">Score Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="range" stroke="#9CA3AF" />
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
                  <Bar dataKey="count" fill="#3B82F6" name="Number of Students" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Difficulty vs Performance */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-gray-900 dark:text-white mb-4">Difficulty vs Success Rate</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={difficultyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="difficulty" stroke="#9CA3AF" />
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
                  <Bar dataKey="avgSuccess" fill="#10B981" name="Average Success Rate (%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* Questions Tab */}
        {selectedView === 'questions' && (
          <>
            {/* Question Performance Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-gray-900 dark:text-white mb-4">Question Performance Overview</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={questionPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="question" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" domain={[0, 100]} />
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
                    dataKey="successRate"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    name="Success Rate (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed Question Analysis */}
            <div className="space-y-4">
              {questionAnalysis.map((q, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-gray-900 dark:text-white">
                          Question {q.questionNumber}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${q.difficulty === 'easy'
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                          : q.difficulty === 'medium'
                            ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                            : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                          }`}>
                          {q.difficulty}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                          {q.type}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {q.marks} marks
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300">{q.text}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Success Rate</div>
                      <div className="text-blue-600 dark:text-blue-400 mt-1">
                        {q.successRate}%
                      </div>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Total Responses</div>
                      <div className="text-green-600 dark:text-green-400 mt-1">
                        {q.totalResponses}
                      </div>
                    </div>
                    {q.type === 'mcq' ? (
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Correct Answers</div>
                        <div className="text-purple-600 dark:text-purple-400 mt-1">
                          {q.correctCount} ({((q.correctCount / q.totalResponses) * 100).toFixed(0)}%)
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Avg Marks</div>
                        <div className="text-purple-600 dark:text-purple-400 mt-1">
                          {q.averageMarks} / {q.marks}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Answer Distribution for MCQ */}
                  {q.type === 'mcq' && q.answerDistribution && (
                    <div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">Answer Distribution</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.entries(q.answerDistribution).map(([option, count]) => (
                          <div
                            key={option}
                            className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-600"
                          >
                            <div className="text-xs text-gray-600 dark:text-gray-400">{option}</div>
                            <div className="text-gray-900 dark:text-white">
                              {count} ({((count / q.totalResponses) * 100).toFixed(0)}%)
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Students Tab */}
        {selectedView === 'students' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Student Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Violations
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {studentPerformanceData.map((student, index) => (
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
                        <div className="text-gray-900 dark:text-white">{student.studentName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-sm ${student.score >= 80
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                          : student.score >= 60
                            ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : student.score >= 40
                              ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                              : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                          }`}>
                          {student.score.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {student.violations > 0 && (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className={student.violations > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}>
                            {student.violations}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs ${student.status === 'graded'
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                          : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                          }`}>
                          {student.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}