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

        // If quiz has no descriptive questions, it's always fully graded
        if (!hasDescriptiveQuestions(quizWithQuestions)) {
            return 'graded';
        }

        // For quizzes with descriptive questions, check if all are graded
        const allGraded = quizWithQuestions.questions.every((q: any) => {
            if (q.type === 'descriptive' || q.type === 'short_answer') {
                const answer = attempt.answers.find((a: any) => a.question_id === q.id);
                return answer && answer.marks_awarded !== null && answer.marks_awarded !== undefined;
            }
            return true; // MCQ questions are always graded
        });

        return allGraded ? 'graded' : 'pending';
    };

    const fetchResultDetail = async () => {
        try {
            setLoading(true);
            const response = await apiService.get(`/api/attempts/${attemptId}`);
            const attemptData = response.data as any;
            setAttempt(attemptData);

            // Fetch quiz details
            try {
                const quizResponse = await apiService.get(`/api/quizzes/${attemptData.quiz_id}?include_questions=true`);
                const quizData = quizResponse.data as any;
                setQuiz(quizData.quiz);
            } catch (quizError: any) {
                console.error('Failed to fetch quiz details:', quizError);
                toast.error('Could not load quiz details. Showing available data.');

                // Reconstruct quiz from attempt data as fallback
                const reconstructedQuiz = {
                    id: attemptData.quiz_id,
                    title: 'Quiz Details',
                    questions: attemptData.answers.map((answer: any) => ({
                        id: answer.question_id,
                        type: answer.answer_option !== null ? 'mcq' : 'short_answer',
                        text: `Question ${answer.question_id}`,
                        marks: 5,
                        options: answer.answer_option !== null ? ['Option A', 'Option B', 'Option C', 'Option D'] : null,
                        correctAnswer: answer.answer_option !== null ? 0 : null
                    }))
                };
                setQuiz(reconstructedQuiz);
            }
        } catch (error: any) {
            console.error('Failed to fetch result details:', error);
            toast.error('Failed to load result details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (attemptId) {
            fetchResultDetail();
        }
    }, [attemptId]);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-400">Loading result details...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!attempt) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Result Not Found</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">The requested result could not be found.</p>
                        <Link
                            to="/student/results"
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Results
                        </Link>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const percentage = attempt.total_marks > 0 ? Math.round((attempt.score / attempt.total_marks) * 100) : 0;
    const gradingStatus = getGradingStatus(attempt, quiz);

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto p-6">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-4 mb-4">
                        <Link
                            to="/student/results"
                            className="inline-flex items-center px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Results
                        </Link>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {getQuizTitle(attempt.quiz_id)}
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Submitted: {new Date(attempt.submitted_at).toLocaleDateString()}
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${gradingStatus === 'graded'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            }`}>
                            {gradingStatus === 'graded' ? 'Fully Graded' : 'Grading in Progress'}
                        </div>
                    </div>
                </div>

                {/* Score Summary */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Score Summary</h2>
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

                {/* Questions and Answers */}
                <div className="space-y-4">
                    {quiz?.questions && quiz.questions.length > 0 ? (
                        <>
                            {/* View Mode Toggle */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        View Mode:
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setViewMode('single')}
                                            className={`px-3 py-1 rounded-lg text-sm font-medium ${viewMode === 'single'
                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                                                }`}
                                        >
                                            Single Question
                                        </button>
                                        <button
                                            onClick={() => setViewMode('all')}
                                            className={`px-3 py-1 rounded-lg text-sm font-medium ${viewMode === 'all'
                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                                                }`}
                                        >
                                            All Questions
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Navigation Header (only for single view) */}
                            {viewMode === 'single' && (
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <button
                                            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                                            disabled={currentQuestionIndex === 0}
                                            className={`p-2 rounded-lg ${currentQuestionIndex === 0
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700'
                                                : 'bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30'}`}
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>

                                        <div className="text-center">
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                Question {currentQuestionIndex + 1} of {quiz.questions.length}
                                            </div>
                                            <div className="flex gap-1 mt-1">
                                                {quiz.questions.map((_: any, index: number) => (
                                                    <div
                                                        key={index}
                                                        className={`w-2 h-2 rounded-full ${index === currentQuestionIndex
                                                                ? 'bg-blue-600 dark:bg-blue-400'
                                                                : 'bg-gray-300 dark:bg-gray-600'
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setCurrentQuestionIndex(Math.min(quiz.questions.length - 1, currentQuestionIndex + 1))}
                                            disabled={currentQuestionIndex === quiz.questions.length - 1}
                                            className={`p-2 rounded-lg ${currentQuestionIndex === quiz.questions.length - 1
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700'
                                                : 'bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30'}`}
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Questions - Single or All View */}
                            {viewMode === 'single' ? (
                                /* Single Question View */
                                (() => {
                                    const question = quiz.questions[currentQuestionIndex];
                                    const studentAnswer = attempt.answers.find((a: any) => a.question_id === question.id);

                                    // Check if quiz is fully graded (all questions have actual grades)
                                    const isFullyGraded = !quiz.questions.some((q: any) =>
                                        q.type === 'descriptive' || q.type === 'short_answer'
                                    ) || quiz.questions.every((q: any) => {
                                        if (q.type === 'descriptive' || q.type === 'short_answer') {
                                            const answer = attempt.answers.find((a: any) => a.question_id === q.id);
                                            return answer && answer.marks_awarded !== null && answer.marks_awarded !== undefined;
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
                                })()
                            ) : (
                                /* All Questions View */
                                quiz.questions.map((question: any, index: number) => {
                                    const studentAnswer = attempt.answers.find((a: any) => a.question_id === question.id);

                                    // Check if quiz is fully graded (all questions have actual grades)
                                    const isFullyGraded = !quiz.questions.some((q: any) =>
                                        q.type === 'descriptive' || q.type === 'short_answer'
                                    ) || quiz.questions.every((q: any) => {
                                        if (q.type === 'descriptive' || q.type === 'short_answer') {
                                            const answer = attempt.answers.find((a: any) => a.question_id === q.id);
                                            return answer && answer.marks_awarded !== null && answer.marks_awarded !== undefined;
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
                                })
                            )}
                        </>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-gray-600 dark:text-gray-400">No questions available for this quiz.</p>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
