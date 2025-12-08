import { useState } from 'react';
import DashboardLayout from '../shared/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle, Clock, Eye, Filter, Download, Printer } from 'lucide-react';
import { quizAttempts, quizzes, students, teachers } from '../../lib/mockData';
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

  // Get teacher's classes
  const teacher = teachers.find(t => t.id === user.id);
  const teacherClassIds = teacher?.classIds || [];

  // Filter attempts by teacher's students
  const teacherAttempts = quizAttempts.filter(a => {
    const student = students.find(s => s.id === a.studentId);
    return student && teacherClassIds.includes(student.classId);
  });

  // Filter for pending attempts (only those with descriptive questions)
  const pendingAttempts = teacherAttempts.filter(attempt => {
    if (attempt.status !== 'pending') return false;
    const quiz = quizzes.find(q => q.id === attempt.quizId);
    const hasDescriptive = quiz?.questions.some(q => q.type === 'descriptive');
    return hasDescriptive;
  });

  const reviewedAttempts = teacherAttempts.filter(a => a.status === 'graded');

  const getQuizTitle = (quizId: string) => {
    return quizzes.find(q => q.id === quizId)?.title || 'Unknown Quiz';
  };

  const getStudentName = (studentId: string) => {
    return students.find(s => s.id === studentId)?.name || 'Unknown Student';
  };

  // Filter by quiz if selected
  let attemptsToShow = activeTab === 'pending' ? pendingAttempts : reviewedAttempts;
  if (filterQuiz !== 'all') {
    attemptsToShow = attemptsToShow.filter(a => a.quizId === filterQuiz);
  }

  // Get unique quizzes for filter
  const uniqueQuizzes = Array.from(new Set(teacherAttempts.map(a => a.quizId)))
    .map(id => quizzes.find(q => q.id === id))
    .filter(Boolean);

  const handleExportCSV = () => {
    const csvData = [
      ['Grading Dashboard Report'],
      ['Teacher:', user.name],
      ['Status:', activeTab === 'pending' ? 'Pending Review' : 'Reviewed'],
      ['Generated:', new Date().toLocaleString()],
      [''],
      ['Quiz Title', 'Student Name', 'Registration Number', 'Submitted At', 'Status', 'Score', 'Total Marks', 'Percentage (%)'],
      ...attemptsToShow.map(attempt => {
        const student = students.find(s => s.id === attempt.studentId);
        const percentage = attempt.status === 'graded'
          ? Math.round((attempt.score / attempt.totalMarks) * 100)
          : 'N/A';
        return [
          getQuizTitle(attempt.quizId),
          student?.name || 'Unknown',
          student?.registrationNumber || 'N/A',
          new Date(attempt.submittedAt).toLocaleString(),
          attempt.status,
          attempt.status === 'graded' ? attempt.score.toString() : 'Pending',
          attempt.totalMarks.toString(),
          percentage.toString()
        ];
      }),
      [''],
      ['Summary'],
      ['Total Submissions:', attemptsToShow.length.toString()],
      ['Pending:', pendingAttempts.length.toString()],
      ['Reviewed:', reviewedAttempts.length.toString()],
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

  if (selectedAttempt) {
    return (
      <DashboardLayout user={user} onLogout={logout}>
        <GradingInterface
          attempt={selectedAttempt}
          onComplete={() => setSelectedAttempt(null)}
          onBack={() => setSelectedAttempt(null)}
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
            Reviewed ({reviewedAttempts.length})
          </button>
        </div>

        <div className="grid gap-4">
          {attemptsToShow.map((attempt) => {
            const quiz = quizzes.find(q => q.id === attempt.quizId);
            const student = students.find(s => s.id === attempt.studentId);
            const descriptiveCount = quiz?.questions.filter(q => q.type === 'descriptive').length || 0;

            return (
              <div
                key={attempt.id}
                className="bg-card rounded-xl p-6 border"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg mb-1">
                      {getQuizTitle(attempt.quizId)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Student: {student?.name} ({student?.registrationNumber})
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Submitted: {new Date(attempt.submittedAt).toLocaleString()}
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
                          Score: {attempt.score}/{attempt.totalMarks} ({Math.round((attempt.score / attempt.totalMarks) * 100)}%)
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
          })}
          {attemptsToShow.length === 0 && (
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