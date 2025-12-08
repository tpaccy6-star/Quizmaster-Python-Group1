import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, Clock, Flag, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiService } from '../../lib/api';
import { toast } from 'sonner';
import DashboardLayout from '../shared/DashboardLayout';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

export default function QuizTaking() {
  const { currentUser: user, logout } = useAuth();

  if (!user) {
    return <div>Loading...</div>;
  }
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [violations, setViolations] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load quiz data
  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const response = await apiService.getQuiz(quizId!, true);
        if (response.data && typeof response.data === 'object') {
          const quizData = response.data as any;
          setQuiz(quizData);
          setTimeRemaining(quizData.time_limit ? quizData.time_limit * 60 : 0);
        }
      } catch (error) {
        toast.error('Failed to load quiz');
        navigate('/student');
      } finally {
        setLoading(false);
      }
    };
    loadQuiz();
  }, [quizId, navigate]);

  if (loading || !quiz) {
    return (
      <DashboardLayout user={user} onLogout={logout}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Enter fullscreen on mount
  useEffect(() => {
    if (!quiz) return;

    // Request fullscreen
    const requestFullscreen = () => {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        (element as any).webkitRequestFullscreen();
      } else if ((element as any).msRequestFullscreen) {
        (element as any).msRequestFullscreen();
      }
    };

    requestFullscreen();
    setIsFullscreen(true);

    return () => {
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.warn('Error exiting fullscreen:', err));
      }
    };
  }, [quiz, user.id, navigate]);

  // Timer
  useEffect(() => {
    if (timeRemaining <= 0) {
      handleSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Anti-cheating: Monitor focus and tab switches
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const newViolations = violations + 1;
        setViolations(newViolations);
        setWarningMessage(`Warning: Tab switching detected! Violations: ${newViolations}/3`);
        setShowWarning(true);

        if (newViolations >= 3) {
          handleSubmit();
        }
      }
    };

    const handleBlur = () => {
      setWarningMessage('Warning: Focus lost! Please stay on this page.');
      setShowWarning(true);
    };

    // Prevent context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Prevent copy/paste/cut
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [violations]);

  const handleSubmit = useCallback(async () => {
    try {
      // Calculate score
      let score = 0;
      let totalMarks = 0;

      quiz.questions.forEach((question: any) => {
        totalMarks += question.marks || 1;
        const userAnswer = answers[question.id];

        if (question.type === 'mcq' && userAnswer === question.correct_answer) {
          score += question.marks || 1;
        } else if (question.type === 'descriptive') {
          // For descriptive questions, manual grading would be needed
          // For now, we'll give partial marks
          score += (question.marks || 1) * 0.5;
        }
      });

      const attemptData = {
        quiz_id: quiz.id,
        student_id: user.id,
        answers,
        score,
        total_marks: totalMarks,
        violations,
        submitted_at: new Date().toISOString(),
        status: 'completed'
      };

      // Submit attempt via API
      const response = await fetch('http://127.0.0.1:5000/api/attempts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(attemptData)
      });

      if (response.ok) {
        toast.success('Quiz submitted successfully!');
        navigate('/student/results');
      } else {
        throw new Error('Failed to submit quiz');
      }
    } catch (error) {
      toast.error('Failed to submit quiz. Please try again.');
    } finally {
      // Exit fullscreen
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.warn('Error exiting fullscreen:', err));
      }
    }
  }, [answers, violations, navigate, quiz, user.id]);

  const confirmSubmit = () => {
    setShowSubmitDialog(true);
  };

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl mb-4">Quiz not found</h1>
          <button
            onClick={() => navigate('/student')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getQuestionStatus = (index: number) => {
    const questionId = quiz.questions[index].id;
    if (index === currentQuestionIndex) return 'current';
    if (answers[questionId] !== undefined) return 'answered';
    return 'unanswered';
  };

  const handleAnswerChange = (questionId: string, answer: string | number) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Warning Banner */}
      {showWarning && (
        <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{warningMessage}</span>
          </div>
          <button
            onClick={() => setShowWarning(false)}
            className="text-white hover:text-gray-200"
          >
            ×
          </button>
        </div>
      )}

      {/* Top Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl">{quiz.title}</h1>
            <p className="text-sm text-gray-400">{user.name}</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              <span className={`text-lg ${timeRemaining < 300 ? 'text-red-400' : 'text-white'}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
            {violations > 0 && (
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span>Violations: {violations}/3</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Question Palette Sidebar */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
          <h2 className="text-sm text-gray-400 mb-4">Question Palette</h2>
          <div className="grid grid-cols-5 gap-2 mb-6">
            {quiz.questions.map((_, index) => {
              const status = getQuestionStatus(index);
              return (
                <button
                  key={index}
                  onClick={() => goToQuestion(index)}
                  className={`w-10 h-10 rounded-lg text-sm transition-colors ${status === 'current'
                    ? 'bg-blue-600 text-white'
                    : status === 'answered'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-600 rounded"></div>
              <span className="text-gray-400">Current</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-600 rounded"></div>
              <span className="text-gray-400">Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-700 rounded"></div>
              <span className="text-gray-400">Unanswered</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Progress Bar */}
          <div className="bg-gray-800 px-6 py-2">
            <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
              <span>Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Question Content */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto">
              <div className="bg-gray-800 rounded-xl p-8 mb-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <span className="inline-block px-3 py-1 bg-blue-600 text-white text-sm rounded-full mb-4">
                      {currentQuestion.type === 'mcq' ? 'Multiple Choice' : 'Descriptive'}
                    </span>
                    <h2 className="text-xl text-white">{currentQuestion.text}</h2>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">Marks</div>
                    <div className="text-lg text-white">{currentQuestion.marks}</div>
                  </div>
                </div>

                {/* MCQ Options */}
                {currentQuestion.type === 'mcq' && currentQuestion.options && (
                  <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => (
                      <label
                        key={index}
                        className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${answers[currentQuestion.id] === index
                          ? 'border-blue-600 bg-blue-600/10'
                          : 'border-gray-700 hover:border-gray-600'
                          }`}
                      >
                        <input
                          type="radio"
                          name={`question-${currentQuestion.id}`}
                          checked={answers[currentQuestion.id] === index}
                          onChange={() => handleAnswerChange(currentQuestion.id, index)}
                          className="mr-3"
                        />
                        <span className="text-white">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Descriptive Answer */}
                {currentQuestion.type === 'descriptive' && (
                  <textarea
                    value={(answers[currentQuestion.id] as string) || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    className="w-full h-48 p-4 bg-gray-700 border border-gray-600 rounded-lg text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Type your answer here..."
                  />
                )}
              </div>
            </div>
          </div>

          {/* Navigation Footer */}
          <div className="bg-gray-800 border-t border-gray-700 px-8 py-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <button
                onClick={() => goToQuestion(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
                className="flex items-center gap-2 px-6 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                Previous
              </button>

              <button
                onClick={confirmSubmit}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                <Flag className="w-5 h-5" />
                Submit Quiz
              </button>

              <button
                onClick={() => goToQuestion(Math.min(quiz.questions.length - 1, currentQuestionIndex + 1))}
                disabled={currentQuestionIndex === quiz.questions.length - 1}
                className="flex items-center gap-2 px-6 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Quiz</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit the quiz? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}