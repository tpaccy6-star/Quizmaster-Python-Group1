import { useState, useEffect } from 'react';
import DashboardLayout from '../shared/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle, Clock, Eye, Filter, Download, Printer, Loader2, RefreshCw } from 'lucide-react';
import { apiService } from '../../lib/api';
import GradingInterface from './GradingInterface';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';

export default function GradingDashboard() {
  const { currentUser: user, logout } = useAuth();

  if (!user) {
    return <div>Loading...</div>;
  }
  const [activeTab, setActiveTab] = useState<'pending' | 'reviewed'>('pending');
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  const [filterQuiz, setFilterQuiz] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [pendingAttempts, setPendingAttempts] = useState<any[]>([]);
  const [gradedAttempts, setGradedAttempts] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);

  const normalizeAttempt = (attempt: any) => {
    const quiz = attempt?.quiz ?? attempt?.quiz_details ?? attempt?.quizInfo ?? null;
    const student = attempt?.student ?? attempt?.student_info ?? null;

    const rawScore = attempt?.score ?? attempt?.total_score ?? attempt?.obtained_score ?? null;
    const rawTotalMarks = attempt?.totalMarks ?? attempt?.total_marks ?? quiz?.total_marks ?? quiz?.totalMarks ?? null;
    const rawPercentage = attempt?.percentage ?? attempt?.percentage_score ?? attempt?.percent ?? null;

    const score = typeof rawScore === 'string' ? Number(rawScore) : rawScore;
    const totalMarks = typeof rawTotalMarks === 'string' ? Number(rawTotalMarks) : rawTotalMarks;
    let percentage = typeof rawPercentage === 'string' ? Number(rawPercentage) : rawPercentage;

    if ((percentage === null || Number.isNaN(percentage)) && totalMarks) {
      percentage = totalMarks > 0 && score != null ? (Number(score) / Number(totalMarks)) * 100 : null;
    }

    const submittedAt = attempt?.submittedAt ?? attempt?.submitted_at ?? null;
    const startedAt = attempt?.startedAt ?? attempt?.started_at ?? null;

    const studentName = student?.name ?? student?.full_name ?? student?.fullName ?? attempt?.student_name ?? 'Unknown Student';
    const registrationNumber = student?.registration_number ?? student?.registrationNumber ?? attempt?.registration_number ?? 'N/A';

    return {
      ...attempt,
      quiz,
      student,
      score: score != null && !Number.isNaN(score) ? Number(score) : null,
      totalMarks: totalMarks != null && !Number.isNaN(totalMarks) ? Number(totalMarks) : null,
      percentage: percentage != null && !Number.isNaN(percentage) ? Number(percentage) : null,
      submittedAt,
      startedAt,
      studentName,
      registrationNumber,
    };
  };

  // Load data
  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'pending') {
        const response = await apiService.getPendingAttempts();
        const attempts = (response as any).attempts || [];
        setPendingAttempts(attempts.map(normalizeAttempt));
        const quizzesPayload = (response as any).quizzes || [];
        if (Array.isArray(quizzesPayload) && quizzesPayload.length > 0) {
          setQuizzes(quizzesPayload);
        }
      } else {
        const response = await apiService.getGradedAttempts();
        const attempts = (response as any).attempts || [];
        setGradedAttempts(attempts.map(normalizeAttempt));
        const quizzesPayload = (response as any).quizzes || [];
        if (Array.isArray(quizzesPayload) && quizzesPayload.length > 0) {
          setQuizzes(quizzesPayload);
        }
      }
    } catch (error) {
      toast.error('Failed to load attempts');
      console.error('Error loading attempts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh data when returning from grading
  const handleGradingComplete = () => {
    setSelectedAttempt(null);
    loadData(); // Refresh the current tab
  };

  const getQuizTitle = (quiz: any) => quiz?.title || quiz?.quiz_title || 'Unknown Quiz';

  const getStudentName = (attempt: any) => attempt.studentName || attempt.student?.name || 'Unknown Student';

  const getStudentRegNo = (attempt: any) => attempt.registrationNumber || attempt.student?.registrationNumber || 'N/A';

  const formatSubmittedAt = (attempt: any) => {
    if (!attempt.submittedAt) {
      return 'Pending submission';
    }
    const date = new Date(attempt.submittedAt);
    return Number.isNaN(date.getTime()) ? 'Pending submission' : date.toLocaleString();
  };

  // Filter by quiz if selected
  let attemptsToShow = activeTab === 'pending' ? pendingAttempts : gradedAttempts;
  if (filterQuiz !== 'all' && filterQuiz) {
    attemptsToShow = attemptsToShow.filter(a => a.quiz?.id === filterQuiz);
  }

  // Get unique quizzes for filter
  const attemptDerivedQuizzes = [...pendingAttempts, ...gradedAttempts]
    .map(a => a.quiz)
    .filter(Boolean);

  const allQuizzes = [...quizzes, ...attemptDerivedQuizzes];
  const uniqueQuizzesMap = new Map<string, any>();
  for (const quiz of allQuizzes) {
    const id = quiz?.id;
    if (id && !uniqueQuizzesMap.has(id)) {
      uniqueQuizzesMap.set(id, quiz);
    }
  }
  const uniqueQuizzes = Array.from(uniqueQuizzesMap.values());

  const handleExportCSV = () => {
    const csvData = [
      ['Grading Dashboard Report'],
      ['Teacher:', user.name],
      ['Status:', activeTab === 'pending' ? 'Pending Review' : 'Reviewed'],
      ['Generated:', new Date().toLocaleString()],
      [''],
      ['Quiz Title', 'Student Name', 'Registration Number', 'Submitted At', 'Status', 'Score', 'Total Marks', 'Percentage (%)'],
      ...attemptsToShow.map(attempt => {
        const score = attempt.score ?? 0;
        const totalMarks = attempt.totalMarks ?? attempt.quiz?.total_marks ?? attempt.quiz?.totalMarks ?? 0;
        const percentage = attempt.status === 'graded' && totalMarks
          ? Math.round((score / totalMarks) * 100)
          : 'N/A';
        return [
          getQuizTitle(attempt.quiz),
          getStudentName(attempt),
          getStudentRegNo(attempt),
          formatSubmittedAt(attempt),
          attempt.status,
          attempt.status === 'graded' && attempt.score != null ? attempt.score.toString() : 'Pending',
          totalMarks ? totalMarks.toString() : '0',
          percentage.toString()
        ];
      }),
      [''],
      ['Summary'],
      ['Total Submissions:', attemptsToShow.length.toString()],
      ['Pending:', pendingAttempts.length.toString()],
      ['Reviewed:', gradedAttempts.length.toString()],
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grading-dashboard-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Grading data exported as CSV');
  };

  const handlePrint = () => {
    window.print();
    toast.success('Print dialog opened');
  };

  const handleRefresh = () => {
    loadData();
    toast.success('Data refreshed');
  };

  if (selectedAttempt) {
    return (
      <DashboardLayout user={user} onLogout={logout}>
        <GradingInterface
          attempt={selectedAttempt}
          onComplete={handleGradingComplete}
          onBack={handleGradingComplete}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} onLogout={logout}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl">Grading Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Grade and review student submissions
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors print:hidden"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors print:hidden"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors print:hidden"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={filterQuiz} onValueChange={setFilterQuiz}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by quiz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Quizzes</SelectItem>
                  {uniqueQuizzes.map(quiz => (
                    <SelectItem key={quiz!.id} value={quiz!.id}>
                      {quiz!.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingAttempts.length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600 opacity-20" />
            </div>
          </div>
          <div className="bg-card rounded-xl p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Graded</p>
                <p className="text-2xl font-bold text-green-600">{gradedAttempts.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 opacity-20" />
            </div>
          </div>
          <div className="bg-card rounded-xl p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Submissions</p>
                <p className="text-2xl font-bold">{pendingAttempts.length + gradedAttempts.length}</p>
              </div>
              <Eye className="w-8 h-8 text-primary opacity-20" />
            </div>
          </div>
        </div>

        <div className="flex gap-4 border-b">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 -mb-px ${activeTab === 'pending'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground'
              }`}
          >
            Pending Review ({pendingAttempts.length})
          </button>
          <button
            onClick={() => setActiveTab('reviewed')}
            className={`px-4 py-2 -mb-px ${activeTab === 'reviewed'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground'
              }`}
          >
            Reviewed ({gradedAttempts.length})
          </button>
        </div>

        <div className="grid gap-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading attempts...</span>
            </div>
          ) : attemptsToShow.length > 0 ? (
            attemptsToShow.map((attempt) => {
              const descriptiveCount = attempt.quiz?.questions?.filter((q: any) => q.type === 'descriptive').length || 0;

              return (
                <div
                  key={attempt.id}
                  className="bg-card rounded-xl p-6 border"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg mb-1">
                        {getQuizTitle(attempt.quiz)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Student: {getStudentName(attempt)} ({getStudentRegNo(attempt)})
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Submitted: {formatSubmittedAt(attempt)}
                      </p>
                      {descriptiveCount > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {descriptiveCount} descriptive question{descriptiveCount > 1 ? 's' : ''} to grade
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {activeTab === 'pending' ? (
                        <span className="flex items-center gap-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-full text-sm">
                          <Clock className="w-4 h-4" />
                          Pending
                        </span>
                      ) : (
                        <div className="text-right">
                          <span className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full text-sm mb-2">
                            <CheckCircle className="w-4 h-4" />
                            Graded
                          </span>
                          <p className="text-sm text-muted-foreground">
                            {(() => {
                              const score = attempt.score ?? 0;
                              const totalMarks = attempt.totalMarks ?? attempt.quiz?.total_marks ?? attempt.quiz?.totalMarks ?? 0;
                              if (!totalMarks) {
                                return 'Score: Pending';
                              }
                              const percentage = Math.round((score / totalMarks) * 100);
                              return `Score: ${score}/${totalMarks} (${percentage}%)`;
                            })()}
                          </p>
                        </div>
                      )}
                      <button
                        onClick={() => setSelectedAttempt(attempt)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        {activeTab === 'pending' ? 'Grade Now' : 'View Grades'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border">
              {activeTab === 'pending' ? (
                <div>
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No pending submissions to grade</p>
                  <p className="text-sm mt-2">
                    Submissions with descriptive questions will appear here
                  </p>
                </div>
              ) : (
                <div>
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No reviewed submissions yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}