import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, Clock, Flag, ChevronLeft, ChevronRight, Maximize2, Eye, EyeOff } from 'lucide-react';
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
import RichTextEditor from '../ui/rich-text-editor';
import QuizSubmitModal from './QuizSubmitModal';
import AntiCheatSystem from './AntiCheatSystem';

const STORAGE_PREFIX = 'quiz_attempt_state_';

export default function QuizTaking() {
  const { currentUser: user, logout } = useAuth();

  if (!user) {
    return <div>Loading...</div>;
  }
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState<any>(null);
  const [quiz, setQuiz] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Add logging to track setTimeRemaining calls
  const setTimeRemainingWithLog = (value: number | null | ((prev: number | null) => number | null)) => {
    console.log('setTimeRemaining called with:', value);
    if (typeof value === 'function') {
      setTimeRemaining((prev) => {
        const result = value(prev);
        console.log('setTimeRemaining function result:', result);
        return result;
      });
    } else {
      console.log('setTimeRemaining direct value:', value);
      setTimeRemaining(value);
    }
  };
  const [violations, setViolations] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  // Remove debug display - timer is fixed
  // const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showFullscreenDialog, setShowFullscreenDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stateRestored, setStateRestored] = useState(false);

  const attemptIdentifier = attempt?.id ?? attemptId;
  const storageKey = useMemo(() => attemptIdentifier ? `${STORAGE_PREFIX}${attemptIdentifier}` : null, [attemptIdentifier]);

  const requestFullscreen = useCallback(() => {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if ((element as any).webkitRequestFullscreen) {
      (element as any).webkitRequestFullscreen();
    } else if ((element as any).msRequestFullscreen) {
      (element as any).msRequestFullscreen();
    }
  }, []);

  // Monitor website visits (simplified - in real app would need more sophisticated tracking)
  const monitorWebsiteVisits = useCallback(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched tabs or minimized window
        setViolations(prev => prev + 1);
        toast.warning('Tab switching detected! This has been recorded.');
      }
    };

    const handleBlur = () => {
      // Window lost focus
      setViolations(prev => prev + 1);
      toast.warning('Window focus lost! This has been recorded.');
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setViolations(prev => prev + 1);
      toast.error('Right-click disabled! Violation recorded.');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block common shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c' || e.key === 'v' || e.key === 'x' ||
          e.key === 'r' || e.key === 'f' || e.key === 'a') {
          e.preventDefault();
          setViolations(prev => prev + 1);
          toast.error('Keyboard shortcuts disabled! Violation recorded.');
        }
      }
      // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
        (e.ctrlKey && e.key === 'U')) {
        e.preventDefault();
        setViolations(prev => prev + 1);
        toast.error('Developer tools disabled! Violation recorded.');
      }
    };

    // Add event listeners
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
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!attemptIdentifier) {
      toast.error('Attempt ID is missing. Please restart the quiz.');
      return;
    }

    try {
      await apiService.submitQuiz(attemptIdentifier);
      toast.success('Quiz submitted successfully!');
      if (storageKey) {
        sessionStorage.removeItem(storageKey);
      }
      navigate('/student/results');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit quiz. Please try again.');
    } finally {
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.warn('Error exiting fullscreen:', err));
      }
    }
  }, [attemptIdentifier, navigate, storageKey]);

  // Handle violations from AntiCheatSystem
  const handleViolation = useCallback((type: string, count: number) => {
    setViolations(prev => count);
    console.log(`Violation ${type} detected. Total: ${count}`);

    if (count >= 3) {
      toast.error('Quiz terminated due to excessive violations!');
      setTimeout(() => {
        handleSubmit();
        navigate('/student/quizzes');
      }, 2000);
    }
  }, [handleSubmit, navigate]);

  // Handle fullscreen exit
  const handleFullscreenExit = useCallback(() => {
    toast.error('Fullscreen exited! Submitting quiz...');
    setTimeout(() => {
      handleSubmit();
      navigate('/student/quizzes');
    }, 2000);
  }, [handleSubmit, navigate]);

  const isReady = !loading && !!quiz;

  // Load attempt and quiz data
  useEffect(() => {
    const loadAttempt = async () => {
      try {
        if (!attemptId) {
          throw new Error('Attempt id missing');
        }

        const response = await apiService.getAttempt(attemptId);
        const attemptPayload = (response as any)?.attempt || response;

        if (!attemptPayload?.quiz) {
          throw new Error('Quiz not found');
        }

        if (attemptPayload.status && attemptPayload.status !== 'in_progress') {
          toast.info('This attempt has already been submitted.');
          navigate('/student/results');
          return;
        }

        setAttempt(attemptPayload);
        setQuiz(attemptPayload.quiz);

        const initialAnswers: Record<string, string | number> = {};
        if (Array.isArray(attemptPayload.answers)) {
          attemptPayload.answers.forEach((answer: any) => {
            if (answer.question_id) {
              if (answer.answer_text !== null && answer.answer_text !== undefined) {
                initialAnswers[answer.question_id] = answer.answer_text;
              } else if (answer.answer_option !== null && answer.answer_option !== undefined) {
                initialAnswers[answer.question_id] = answer.answer_option;
              }
            }
          });
        }
        setAnswers(initialAnswers);

        const timeLimitMinutes = attemptPayload.quiz.duration_minutes ?? attemptPayload.quiz.time_limit_minutes ?? attemptPayload.quiz.time_limit ?? 0;
        const totalSeconds = Number(timeLimitMinutes || 0) * 60;
        let remainingSeconds = totalSeconds;

        // Remove debug logging - timer is fixed
        // console.log('Timer Debug:', {
        //   timeLimitMinutes,
        //   totalSeconds,
        //   started_at: attemptPayload.started_at,
        //   quizDuration: attemptPayload.quiz.duration_minutes,
        //   quizTimeLimit: attemptPayload.quiz.time_limit_minutes,
        //   quizTime: attemptPayload.quiz.time_limit,
        //   quizData: attemptPayload.quiz
        // });

        // // Set debug info for display
        // setDebugInfo({
        //   timeLimitMinutes,
        //   totalSeconds,
        //   started_at: attemptPayload.started_at,
        //   quizDuration: attemptPayload.quiz.duration_minutes,
        //   quizTimeLimit: attemptPayload.quiz.time_limit_minutes,
        //   quizTime: attemptPayload.quiz.time_limit,
        //   remainingSeconds,
        //   hasStartedAt: !!attemptPayload.started_at
        // });

        // If no time limit, don't show timer
        if (totalSeconds === 0) {
          console.log('No time limit set for this quiz');
          setTimeRemaining(null);
          return;
        }

        // Calculate elapsed time if quiz has started
        if (attemptPayload.started_at) {
          // Parse the ISO string properly to avoid timezone issues
          const startedAt = new Date(attemptPayload.started_at + 'Z').getTime();
          const now = Date.now();
          const elapsed = Math.floor((now - startedAt) / 1000);
          remainingSeconds = Math.max(totalSeconds - elapsed, 0);
        }

        setTimeRemaining(remainingSeconds);
      } catch (error) {
        toast.error('Failed to load quiz');
        navigate('/student/quizzes');
      } finally {
        setLoading(false);
      }
    };
    loadAttempt();
  }, [attemptId, handleSubmit, navigate]);

  // Check fullscreen on quiz load - only if required by settings
  useEffect(() => {
    if (!loading && quiz && quiz.require_fullscreen && !document.fullscreenElement) {
      setShowFullscreenDialog(true);
    }
  }, [loading, quiz]);

  // Timer countdown effect
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) return prev;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Re-enable sessionStorage restore

  // Re-enable sessionStorage save for answers
  useEffect(() => {
    if (!storageKey || !stateRestored) return;

    const payload = {
      answers,
      currentQuestionIndex,
      timeRemaining: timeRemaining !== null ? Math.max(timeRemaining, 0) : null,
    };

    try {
      sessionStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (err) {
      console.warn('Failed to persist attempt state', err);
    }
  }, [answers, currentQuestionIndex, stateRestored, storageKey, timeRemaining]);
  // Re-enable sessionStorage restore
  useEffect(() => {
    if (!storageKey || !quiz || stateRestored) return;

    const storedRaw = sessionStorage.getItem(storageKey);
    if (!storedRaw) {
      setStateRestored(true);
      return;
    }

    try {
      const stored = JSON.parse(storedRaw) as {
        answers?: Record<string, string | number>;
        currentQuestionIndex?: number;
        timeRemaining?: number;
      };

      if (stored.answers) {
        setAnswers((prev) => ({ ...prev, ...stored.answers! }));
      }

      if (
        typeof stored.currentQuestionIndex === 'number' &&
        stored.currentQuestionIndex >= 0 &&
        stored.currentQuestionIndex < (quiz?.questions?.length ?? Infinity)
      ) {
        setCurrentQuestionIndex(stored.currentQuestionIndex);
      }

      if (typeof stored.timeRemaining === 'number' && stored.timeRemaining >= 0) {
        const storedTime = stored.timeRemaining;
        setTimeRemaining((prev): number | null => {
          if (prev === null) return storedTime;
          return Math.min(prev, storedTime);
        });
      }
    } catch (err) {
      console.warn('Failed to restore attempt state', err);
    }

    setStateRestored(true);
  }, [quiz, stateRestored, storageKey]);

  // Temporarily disable all sessionStorage effects
  // useEffect(() => {
  //   if (!storageKey || !stateRestored) return;

  //   const payload = {
  //     answers,
  //     currentQuestionIndex,
  //     timeRemaining: timeRemaining !== null ? Math.max(timeRemaining, 0) : null,
  //   };

  //   try {
  //     sessionStorage.setItem(storageKey, JSON.stringify(payload));
  //   } catch (err) {
  //     console.warn('Failed to persist attempt state', err);
  //   }
  // }, [answers, currentQuestionIndex, stateRestored, storageKey, timeRemaining]);

  // Enter fullscreen on mount
  useEffect(() => {
    if (!isReady) return;

    requestFullscreen();
    setIsFullscreen(true);

    return () => {
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.warn('Error exiting fullscreen:', err));
      }
    };
  }, [isReady, requestFullscreen]);

  useEffect(() => {
    if (!isReady) return;

    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);

      if (!active) {
        setWarningMessage('Fullscreen was exited. Returning to fullscreen...');
        setShowWarning(true);

        if (attemptIdentifier) {
          apiService
            .recordViolation(attemptIdentifier, 'fullscreen_exit')
            .catch((err) => console.warn('Failed to record violation', err));
        }

        setTimeout(() => {
          requestFullscreen();
        }, 300);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isReady, attemptIdentifier, violations]);

  const confirmSubmit = () => {
    setShowSubmitDialog(true);
  };

  if (!isReady) {
    return (
      <DashboardLayout user={user} onLogout={logout}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

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

  const formatTime = (seconds: number | null) => {
    if (seconds === null || seconds === undefined) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getQuestionStatus = (index: number) => {
    const questionId = quiz.questions[index].id;
    if (index === currentQuestionIndex) return 'current';
    if (answers[questionId] !== undefined && answers[questionId] !== '') return 'answered';
    return 'unanswered';
  };

  const handleAnswerChange = (questionId: string, answer: string | number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));

    if (!attemptIdentifier) {
      return;
    }

    apiService
      .submitAnswer(attemptIdentifier, questionId, answer)
      .catch((err: any) => {
        console.warn('Failed to save answer', err);
        toast.error(err.message || 'Could not save answer. Please check your connection.');
      });
  };

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  return (
    <AntiCheatSystem
      attemptId={attemptId || ''}
      onViolation={handleViolation}
      onFullscreenExit={handleFullscreenExit}
      quiz={quiz}
    >
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
            {violations > 0 && (
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span>Violations: {violations}/3</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              <span className={`text-lg ${timeRemaining !== null && timeRemaining < 300 ? 'text-red-400' : 'text-white'}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex h-[calc(100vh-80px)]">
          {/* Question Palette - Only show if not showing questions one at a time */}
          {!quiz?.show_questions_one_at_a_time && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-sm text-gray-400 mb-4">Question Palette</h2>
              <div className="grid grid-cols-5 gap-2 mb-6">
                {quiz.questions.map((_: any, index: number) => {
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
          )}

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Progress Bar - Only show if enabled in settings */}
            {quiz?.show_progress_bar !== false && (
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
            )}

            {/* Question Content */}
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-4xl mx-auto">
                <div className="bg-gray-800 rounded-xl p-8 mb-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <span className="inline-block px-3 py-1 bg-blue-600 text-white text-sm rounded-full mb-4">
                        {currentQuestion.type === 'mcq' ? 'Multiple Choice' : currentQuestion.type === 'short_answer' ? 'Descriptive' : 'Text'}
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
                      {currentQuestion.options.map((option: any, index: number) => (
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
                  {(currentQuestion.type === 'descriptive' || currentQuestion.type === 'short_answer') && (
                    <RichTextEditor
                      value={(answers[currentQuestion.id] as string) || ''}
                      onChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                      placeholder="Compose your answer here..."
                      className="bg-gray-800"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Footer - Only show if showing questions one at a time */}
            {quiz?.show_questions_one_at_a_time && (
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
            )}

            {/* Submit Button - Always show when not showing questions one at a time */}
            {!quiz?.show_questions_one_at_a_time && (
              <div className="bg-gray-800 border-t border-gray-700 px-8 py-4">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => goToQuestion(Math.max(0, currentQuestionIndex - 1))}
                      disabled={currentQuestionIndex === 0}
                      className="flex items-center gap-2 px-6 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      Previous
                    </button>

                    <span className="text-gray-400 text-sm">
                      Question {currentQuestionIndex + 1} of {quiz.questions.length}
                    </span>

                    <button
                      onClick={() => goToQuestion(Math.min(quiz.questions.length - 1, currentQuestionIndex + 1))}
                      disabled={currentQuestionIndex === quiz.questions.length - 1}
                      className="flex items-center gap-2 px-6 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      Next
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  <button
                    onClick={confirmSubmit}
                    className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                  >
                    <Flag className="w-5 h-5" />
                    Submit Quiz
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit Modal */}
        <QuizSubmitModal
          isOpen={showSubmitDialog}
          onClose={() => setShowSubmitDialog(false)}
          onSubmit={handleSubmit}
          quiz={quiz}
          answersCount={Object.keys(answers).length}
          totalQuestions={quiz?.questions?.length || 0}
          timeRemaining={timeRemaining}
          violations={violations}
        />

        {/* Fullscreen Confirmation Dialog */}
        <AlertDialog open={showFullscreenDialog} onOpenChange={setShowFullscreenDialog}>
          <AlertDialogContent className="bg-gray-800 border-gray-700 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-xl">
                <Maximize2 className="w-6 h-6" />
                Enter Fullscreen Mode
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300">
                This quiz requires fullscreen mode to ensure a secure testing environment.
                Click "Enter Fullscreen" to continue or "Exit Quiz" if you don't want to enter fullscreen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => navigate('/student/quizzes')}
                className="bg-gray-600 hover:bg-gray-700 text-white"
              >
                Exit Quiz
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  requestFullscreen();
                  setShowFullscreenDialog(false);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Enter Fullscreen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AntiCheatSystem>
  );
}