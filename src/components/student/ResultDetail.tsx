import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../shared/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, CheckCircle, XCircle, MessageSquare, Clock, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiService } from '../../lib/api';
import { toast } from 'sonner';

export default function ResultDetail() {
  const { currentUser: user, logout } = useAuth();

  if (!user) {
    return <div>Loading...</div>;
  }
  const { attemptId } = useParams();
  const [attempt, setAttempt] = useState<any>(null);
  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');

  // Helper function to get quiz title
  const getQuizTitle = (quizId: string) => {
    return quiz?.title || 'Quiz Details';
  };

  // Helper function to get quiz by ID
  const getQuizById = (quizId: string) => {
    return quiz;
  };

  // Check if quiz has descriptive questions that need manual grading
  const hasDescriptiveQuestions = (quiz: any) => {
    if (!quiz || !quiz.questions) return false;
    return quiz.questions.some((q: any) => q.type === 'short_answer' || q.type === 'descriptive');
  };

  // Get grading status based on quiz type and attempt status
  const getGradingStatus = (attempt: any, quiz: any) => {
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

  useEffect(() => {
    const fetchResultDetail = async () => {
      try {
        if (!attemptId) {
          throw new Error('Attempt ID is required');
        }

        // Fetch specific attempt details
        const attemptResponse = await apiService.getAttempt(attemptId);
        console.log('Attempt response:', attemptResponse);

        if (!attemptResponse || (!(attemptResponse as any).data && !(attemptResponse as any).attempt)) {
          console.error('Attempt not found in response:', attemptResponse);
          throw new Error('Attempt not found');
        }

        const attempt = (attemptResponse as any).data || (attemptResponse as any).attempt || attemptResponse;
        setAttempt(attempt);
        console.log('ResultDetail - Found attempt:', JSON.stringify(attempt, null, 2));

        // Use the same logic as QuizTaking - get quiz from attempt.quiz
        console.log('ResultDetail - Checking attempt.quiz:', attempt.quiz);
        if (attempt.quiz && attempt.quiz.questions && attempt.quiz.questions.length > 0) {
          setQuiz(attempt.quiz);
          console.log('ResultDetail - Found Quiz from attempt.quiz:', attempt.quiz);
          console.log('ResultDetail - Quiz questions from attempt.quiz:', attempt.quiz.questions);
          console.log('ResultDetail - First question structure:', JSON.stringify(attempt.quiz.questions[0], null, 2));
        } else {
          // Fallback: try to get quiz from general quizzes endpoint
          console.log('ResultDetail - Quiz not found in attempt, trying general endpoint');
          try {
            const quizzesResponse = await apiService.getQuizzes();
            console.log('ResultDetail - General quizzes response:', quizzesResponse);
            const quiz = (quizzesResponse as any).items?.find((q: any) => q.id === attempt.quiz_id);
            if (quiz) {
              setQuiz(quiz);
              console.log('ResultDetail - Found quiz from general endpoint:', quiz);
            } else {
              toast.error('Quiz not found');
            }
          } catch (error) {
            console.error('Error fetching result detail:', error);

            // Handle different error types with specific messages
            if (error instanceof Error) {
              if (error.message.includes('Attempt not found')) {
                toast.error('Attempt not found or you do not have permission to view it');
              } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
                toast.error('Server error occurred. Please try again later');
              } else {
                toast.error(`Failed to load result details: ${error.message}`);
              }
            } else {
              toast.error('Failed to load result details');
            }
          } finally {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Error in fetchResultDetail:', error);
        toast.error('Failed to load result details');
      } finally {
        setLoading(false);
      }
    };

    if (attemptId) {
      fetchResultDetail();
    }
  }, [attemptId, user.id]);

  // Calculate percentage safely - MUST be called before any early returns
  const percentage = useMemo(() => {
    if (!attempt) return 0;
    const score = attempt.score ?? null;
    const totalMarks = attempt.total_marks || attempt.totalMarks || 0;

    if (score !== null && score !== undefined && totalMarks > 0) {
      return Math.round((score / totalMarks) * 100);
    }
    return 0;
  }, [attempt]);

  // Calculate auto-graded MCQ score
  const autoGradedScore = useMemo(() => {
    if (!quiz?.questions || !attempt?.answers) return 0;
    return quiz.questions
      .filter((q: any) => q.type === 'mcq')
      .reduce((total: number, question: any) => {
        const studentAnswer = attempt.answers.find((a: any) => a.question_id === question.id);
        const isCorrect = studentAnswer?.answer_option === question.correctAnswer;
        return total + (isCorrect ? (question.marks || 5) : 0);
      }, 0);
  }, [quiz, attempt]);

  if (loading) {
    return (
      <DashboardLayout user={user} onLogout={logout}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!attempt) {
    return (
      <DashboardLayout user={user} onLogout={logout}>
        <div className="text-center py-12">
          <h2 className="text-2xl text-gray-900 dark:text-white mb-4">Result not found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The attempt you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Link to="/student/results" className="text-blue-600 hover:text-blue-700">
            Go back to results
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} onLogout={logout}>
      <div className="space-y-6">
        <div>
          <Link
            to="/student/results"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Results
          </Link>
          <Link
            to={`/student/results?quiz=${attempt.quiz_id}`}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg mb-4 ml-4"
          >
            View All Attempts
          </Link>
        </div>
        <h1 className="text-3xl text-gray-900 dark:text-white">
          {quiz?.title || getQuizTitle(attempt.quiz_id)}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Detailed feedback and results</p>
      </div>

      {/* Score Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Your Performance</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">{percentage}%</span>
              <span className="text-gray-600 dark:text-gray-400">
                {(() => {
                  const gradingStatus = getGradingStatus(attempt, getQuizById(attempt.quiz_id));
                  if (gradingStatus.status === 'Pending Manual Grading') {
                    return `${autoGradedScore} (auto-graded) + ${attempt.total_marks || attempt.totalMarks - autoGradedScore} (pending grading) marks`;
                  } else {
                    return `${attempt.score || autoGradedScore}/${attempt.total_marks || attempt.totalMarks} marks`;
                  }
                })()}
              </span>
            </div>
            <div className="mt-3">
              {(() => {
                const gradingStatus = getGradingStatus(attempt, getQuizById(attempt.quiz_id));
                return (
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${gradingStatus.color === 'green' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                    gradingStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
                      gradingStatus.color === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
                    }`}>
                    {gradingStatus.color === 'green' && <CheckCircle className="w-4 h-4" />}
                    {gradingStatus.color === 'yellow' && <Clock className="w-4 h-4" />}
                    {gradingStatus.color === 'blue' && <Clock className="w-4 h-4" />}
                    {gradingStatus.color === 'gray' && <AlertCircle className="w-4 h-4" />}
                    {gradingStatus.status}
                  </span>
                );
              })()}
            </div>
            {(() => {
              const gradingStatus = getGradingStatus(attempt, getQuizById(attempt.quiz_id));
              if (gradingStatus.status === 'Pending Manual Grading') {
                return (
                  <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Note:</strong> Some questions require manual grading. Your MCQ questions have been auto-graded, while descriptive/short answer questions are pending teacher review.
                    </p>
                  </div>
                );
              }
            })()}
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{attempt.score || 0}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Score Earned</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{attempt.total_marks || 0}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Possible</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{percentage}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Percentage</div>
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      {quiz && quiz.questions && quiz.questions.length > 0 && (
        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-1">
            <button
              onClick={() => setViewMode('single')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'single'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              Single Question
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              All Questions
            </button>
          </div>
        </div>
      )}

      {/* Questions Display */}
      {quiz && quiz.questions && quiz.questions.length > 0 ? (
        <>
          {viewMode === 'single' ? (
            <>
              {/* Navigation */}
              <div className="flex justify-between items-center mb-6">
                <button
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <span className="text-gray-600 dark:text-gray-400">
                  Question {currentQuestionIndex + 1} of {quiz.questions.length}
                </span>
                <button
                  onClick={() => setCurrentQuestionIndex(Math.min(quiz.questions.length - 1, currentQuestionIndex + 1))}
                  disabled={currentQuestionIndex === quiz.questions.length - 1}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {(() => {
                const question = quiz.questions[currentQuestionIndex];
                const studentAnswer = attempt.answers.find((a: any) => a.question_id === question.id);

                // Check if quiz is fully graded (all questions have actual grades)
                const isFullyGraded = !quiz.questions.some((q: any) =>
                  q.type === 'descriptive' || q.type === 'short_answer'
                ) || quiz.questions.every((q: any) => {
                  if (q.type === 'descriptive' || q.type === 'short_answer') {
                    const answer = attempt.answers.find((a: any) => a.question_id === q.id);
                    console.log(`Checking question ${q.id} (${q.type}):`, {
                      answer: answer,
                      marks_awarded: answer?.marks_awarded,
                      graded_at: answer?.graded_at,
                      attempt_status: attempt.status
                    });
                    // For descriptive questions, consider them graded if:
                    // 1. attempt status is 'graded' AND marks_awarded is not null, OR
                    // 2. attempt status is 'graded' AND there's no descriptive questions (auto-graded only)
                    return (attempt.status === 'graded' && answer && answer.marks_awarded !== null && answer.marks_awarded !== undefined) ||
                      (attempt.status === 'graded' && !answer);
                  }
                  return true; // MCQ questions are auto-graded
                });

                // Only calculate isCorrect if fully graded
                const isCorrect = isFullyGraded && question.type === 'mcq' && studentAnswer?.answer_option === question.correctAnswer;
                const marksAwarded = question.type === 'mcq' && isCorrect ? (question.marks || 5) : (studentAnswer?.marks_awarded || 0);

                // Debug logging
                console.log('Question:', question.id, 'type:', question.type);
                console.log('Attempt status:', attempt.status);
                console.log('Has descriptive questions:', quiz.questions.some((q: any) => q.type === 'descriptive' || q.type === 'short_answer'));
                console.log('isFullyGraded:', isFullyGraded);
                console.log('isCorrect:', isCorrect);
                console.log('Should show X icon:', question.type === 'mcq' && isFullyGraded && !isCorrect);

                return (
                  <div
                    key={question.id}
                    className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${question.type === 'mcq'
                        ? isFullyGraded
                          ? isCorrect
                            ? 'bg-green-100 dark:bg-green-900/20'
                            : 'bg-red-100 dark:bg-red-900/20'
                          : 'bg-blue-100 dark:bg-blue-900/20'
                        : 'bg-blue-100 dark:bg-blue-900/20'
                        }`}>
                        {question.type === 'mcq' ? (
                          isFullyGraded ? (
                            isCorrect ? (
                              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                            )
                          ) : (
                            <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          )
                        ) : (
                          <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                                {question.type === 'mcq' ? 'Multiple Choice' :
                                  question.type === 'short_answer' ? 'Short Answer' :
                                    question.type === 'descriptive' ? 'Descriptive' : 'Unknown'}
                              </span>
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
                                Q{currentQuestionIndex + 1}
                              </span>
                            </div>
                            <h3 className="text-lg text-gray-900 dark:text-white mb-1">
                              {question.question_text || question.text || question.question || question.content || `Question ${currentQuestionIndex + 1}`}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Maximum Marks: {question.marks}
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-sm text-gray-600 dark:text-gray-400">Score</div>
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">
                              {marksAwarded}/{question.marks}
                            </div>
                          </div>
                        </div>

                        {/* Answer content based on question type */}
                        {question.type === 'mcq' && question.options && (
                          <div className="space-y-2 mb-4">
                            {question.options.map((option: any, optIndex: number) => (
                              <div
                                key={optIndex}
                                className={`p-3 rounded-lg border-2 ${isFullyGraded && optIndex === question.correctAnswer
                                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                  : optIndex === studentAnswer?.answer_option
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-200 dark:border-gray-700'
                                  }`}
                              >
                                <span className="text-gray-900 dark:text-white">{option}</span>
                                {isFullyGraded && optIndex === question.correctAnswer && (
                                  <span className="ml-2 text-sm text-green-600 dark:text-green-400">
                                    (Correct Answer)
                                  </span>
                                )}
                                {optIndex === studentAnswer?.answer_option && (
                                  <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
                                    (Your Answer)
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {(question.type === 'descriptive' || question.type === 'short_answer') && (
                          <div className="space-y-4">
                            <div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Your Answer:</div>
                              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div
                                  className="text-gray-900 dark:text-white"
                                  dangerouslySetInnerHTML={{
                                    __html: studentAnswer?.answer_text
                                      ? studentAnswer.answer_text
                                        .replace(/<div>/g, '<br>')
                                        .replace(/<\/div>/g, '')
                                        .replace(/<br><br>/g, '<br>')
                                      : 'No answer provided'
                                  }}
                                />
                              </div>
                            </div>
                            {studentAnswer?.feedback && (
                              <div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Teacher Feedback:</div>
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                  <p className="text-gray-900 dark:text-white">{studentAnswer.feedback}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>
          ) : (
            /* All Questions View */
            <>
              {quiz.questions.map((question: any, index: number) => {
                const studentAnswer = attempt.answers.find((a: any) => a.question_id === question.id);

                // Check if quiz is fully graded (all questions have actual grades)
                const isFullyGraded = !quiz.questions.some((q: any) =>
                  q.type === 'descriptive' || q.type === 'short_answer'
                ) || quiz.questions.every((q: any) => {
                  if (q.type === 'descriptive' || q.type === 'short_answer') {
                    const answer = attempt.answers.find((a: any) => a.question_id === q.id);
                    console.log(`[All Questions] Checking question ${q.id} (${q.type}):`, {
                      answer: answer,
                      marks_awarded: answer?.marks_awarded,
                      graded_at: answer?.graded_at,
                      attempt_status: attempt.status
                    });
                    // For descriptive questions, consider them graded if:
                    // 1. attempt status is 'graded' AND marks_awarded is not null, OR
                    // 2. attempt status is 'graded' AND there's no descriptive questions (auto-graded only)
                    return (attempt.status === 'graded' && answer && answer.marks_awarded !== null && answer.marks_awarded !== undefined) ||
                      (attempt.status === 'graded' && !answer);
                  }
                  return true; // MCQ questions are auto-graded
                });

                // Only calculate isCorrect if fully graded
                const isCorrect = isFullyGraded && question.type === 'mcq' && studentAnswer?.answer_option === question.correctAnswer;
                const marksAwarded = question.type === 'mcq' && isCorrect ? (question.marks || 5) : (studentAnswer?.marks_awarded || 0);

                return (
                  <div
                    key={question.id}
                    className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${question.type === 'mcq'
                        ? isFullyGraded
                          ? isCorrect
                            ? 'bg-green-100 dark:bg-green-900/20'
                            : 'bg-red-100 dark:bg-red-900/20'
                          : 'bg-blue-100 dark:bg-blue-900/20'
                        : 'bg-blue-100 dark:bg-blue-900/20'
                        }`}>
                        {question.type === 'mcq' ? (
                          isFullyGraded ? (
                            isCorrect ? (
                              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                            )
                          ) : (
                            <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          )
                        ) : (
                          <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                                {question.type === 'mcq' ? 'Multiple Choice' :
                                  question.type === 'short_answer' ? 'Short Answer' :
                                    question.type === 'descriptive' ? 'Descriptive' : 'Unknown'}
                              </span>
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
                                Q{index + 1}
                              </span>
                            </div>
                            <h3 className="text-lg text-gray-900 dark:text-white mb-1">
                              {question.question_text || question.text || question.question || question.content || `Question ${index + 1}`}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Maximum Marks: {question.marks}
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-sm text-gray-600 dark:text-gray-400">Score</div>
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">
                              {marksAwarded}/{question.marks}
                            </div>
                          </div>
                        </div>

                        {/* Answer content based on question type */}
                        {question.type === 'mcq' && question.options && (
                          <div className="space-y-2 mb-4">
                            {question.options.map((option: any, optIndex: number) => (
                              <div
                                key={optIndex}
                                className={`p-3 rounded-lg border-2 ${isFullyGraded && optIndex === question.correctAnswer
                                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                  : optIndex === studentAnswer?.answer_option
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-200 dark:border-gray-700'
                                  }`}
                              >
                                <span className="text-gray-900 dark:text-white">{option}</span>
                                {isFullyGraded && optIndex === question.correctAnswer && (
                                  <span className="ml-2 text-sm text-green-600 dark:text-green-400">
                                    (Correct Answer)
                                  </span>
                                )}
                                {optIndex === studentAnswer?.answer_option && (
                                  <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
                                    (Your Answer)
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {(question.type === 'descriptive' || question.type === 'short_answer') && (
                          <div className="space-y-4">
                            <div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Your Answer:</div>
                              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div
                                  className="text-gray-900 dark:text-white"
                                  dangerouslySetInnerHTML={{
                                    __html: studentAnswer?.answer_text
                                      ? studentAnswer.answer_text
                                        .replace(/<div>/g, '<br>')
                                        .replace(/<\/div>/g, '')
                                        .replace(/<br><br>/g, '<br>')
                                      : 'No answer provided'
                                  }}
                                />
                              </div>
                            </div>
                            {studentAnswer?.feedback && (
                              <div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Teacher Feedback:</div>
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                  <p className="text-gray-900 dark:text-white">{studentAnswer.feedback}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">No questions available for this quiz.</p>
        </div>
      )}
    </DashboardLayout>
  );
}
