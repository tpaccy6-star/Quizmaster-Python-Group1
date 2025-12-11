import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../shared/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, FileText, Play, AlertCircle, X } from 'lucide-react';
import { apiService } from '../../lib/api';
import { toast } from 'sonner';
import QuizWelcomeModal from './QuizWelcomeModal';

export default function StudentQuizzes() {
    const { currentUser: user, logout } = useAuth();

    if (!user) {
        return <div>Loading...</div>;
    }

    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [classInfo, setClassInfo] = useState<any>(null);
    const [isAccessPromptOpen, setIsAccessPromptOpen] = useState(false);
    const [pendingQuiz, setPendingQuiz] = useState<any | null>(null);
    const [enteredAccessCode, setEnteredAccessCode] = useState('');
    const [currentAccessCode, setCurrentAccessCode] = useState<string | null>(null);
    const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
    const [welcomeQuiz, setWelcomeQuiz] = useState<any | null>(null);
    const [showAllQuizzesModal, setShowAllQuizzesModal] = useState(false);
    const [allQuizzes, setAllQuizzes] = useState<any[]>([]);

    const fetchAllQuizzes = async () => {
        try {
            // Fetch all quiz data regardless of what's shown on main page
            const [dashboardResponse, resultsResponse, allQuizzesResponse] = await Promise.all([
                apiService.getStudentDashboard(),
                apiService.getStudentAttempts(user.id),
                (apiService as any).request('/student/quizzes?all=true').catch(() => null)
            ]);

            const dashboard = dashboardResponse as any;
            const results = resultsResponse as any;
            const allQuizzesData = allQuizzesResponse as any;

            // Get all available quizzes from dashboard
            const availableQuizzes = dashboard?.available_quizzes || [];

            // Get quizzes from attempts (completed/closed quizzes)
            const completedQuizzes = results?.attempts?.map((attempt: any) => attempt.quiz) || [];

            // Get all assigned quizzes (including closed ones) from the all quizzes endpoint
            let allAssignedQuizzes = allQuizzesData?.quizzes || allQuizzesData || [];

            // If the all quizzes endpoint doesn't work, try to get more quizzes
            if (allAssignedQuizzes.length === 0) {
                try {
                    const moreQuizzes = await (apiService as any).getAvailableQuizzes?.();
                    allAssignedQuizzes = (moreQuizzes as any)?.quizzes || (moreQuizzes as any) || [];
                } catch (error) {
                    console.warn('Could not fetch additional quizzes:', error);
                }
            }

            // Combine and deduplicate all quizzes
            const combinedQuizzes = [...availableQuizzes, ...completedQuizzes, ...allAssignedQuizzes].filter(Boolean);
            const uniqueQuizzes = combinedQuizzes.filter((quiz, index, self) =>
                index === self.findIndex((q) => q.id === quiz.id)
            );

            // Sort quizzes: available first, then by closing date, then by status
            const sortedQuizzes = uniqueQuizzes.sort((a, b) => {
                const aAvailable = a?.is_available_now;
                const bAvailable = b?.is_available_now;

                if (aAvailable && !bAvailable) return -1;
                if (!aAvailable && bAvailable) return 1;

                // Both have same availability, sort by status (closed vs open)
                const aClosed = a?.availability_status === 'closed';
                const bClosed = b?.availability_status === 'closed';

                if (aClosed && !bClosed) return 1;
                if (!aClosed && bClosed) return -1;

                // Sort by closing date
                const aCloseDate = a?.available_until ? new Date(a.available_until).getTime() : 0;
                const bCloseDate = b?.available_until ? new Date(b.available_until).getTime() : 0;
                return bCloseDate - aCloseDate; // Most recent closing first
            });

            console.log('All quizzes for modal:', sortedQuizzes);
            setAllQuizzes(sortedQuizzes);
            setShowAllQuizzesModal(true);
        } catch (error) {
            console.error('Failed to fetch all quizzes:', error);
            toast.error('Failed to load quizzes');
        }
    };

    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                const response = await apiService.getStudentDashboard();
                const dashboard = response as any;
                setClassInfo(dashboard?.class || null);

                let items = dashboard?.available_quizzes || [];
                if (!items || items.length === 0) {
                    try {
                        const alt = await (apiService as any).getAvailableQuizzes?.();
                        const altItems = (alt as any)?.quizzes || [];
                        if (altItems.length > 0) items = altItems;
                    } catch { }
                }

                setQuizzes(items);
            } catch (error) {
                toast.error('Failed to load quizzes');
                console.error('Error fetching quizzes:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchQuizzes();
    }, []);

    const formatDateTime = (iso?: string | null) => {
        if (!iso) return null;
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) {
            return null;
        }
        return date.toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    };

    const getAvailabilityInfo = (quiz: any) => {
        const opensAt = formatDateTime(quiz?.available_from);
        const closesAt = formatDateTime(quiz?.available_until);

        if (quiz?.availability_status === 'upcoming') {
            return {
                label: 'Upcoming',
                description: opensAt ? `Opens ${opensAt}` : 'Not yet available',
                badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
            };
        }

        if (quiz?.availability_status === 'closed') {
            return {
                label: 'Closed',
                description: closesAt ? `Closed ${closesAt}` : 'Availability ended',
                badgeClass: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
            };
        }

        return {
            label: 'Open now',
            description: closesAt ? `Closes ${closesAt}` : 'Currently available',
            badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
        };
    };

    const handleStartQuiz = async (quiz: any) => {
        if (!quiz?.is_available_now) {
            const info = getAvailabilityInfo(quiz);
            toast.error(info.description || 'This quiz is not currently available.');
            return;
        }

        // Show welcome modal instead of directly starting quiz
        setWelcomeQuiz(quiz);
        setIsWelcomeModalOpen(true);
    };

    const handleStartQuizAttempt = async () => {
        if (!welcomeQuiz) return;

        try {
            const response = await apiService.startQuiz(welcomeQuiz.id);
            const responseData = response as any;
            const attempt = responseData?.attempt;
            const attemptId = responseData?.attempt_id || attempt?.id;

            if (attemptId) {
                window.location.href = `/student/quiz-taking/${attemptId}`;
            } else {
                toast.error('Quiz attempt could not be started. Please try again.');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to start quiz');
        }
    };

    const openAccessPrompt = (quiz: any) => {
        const info = getAvailabilityInfo(quiz);

        if (!quiz?.is_available_now) {
            toast.error(info.description || 'This quiz is not currently available.');
            return;
        }

        if ((quiz?.remaining_attempts ?? 0) <= 0) {
            toast.error('No attempts remain for this quiz.');
            return;
        }

        if (!quiz?.access_code) {
            handleStartQuiz(quiz);
            return;
        }
        setPendingQuiz(quiz);
        setEnteredAccessCode('');
        setCurrentAccessCode(quiz.access_code ? String(quiz.access_code).toUpperCase() : null);
        setIsAccessPromptOpen(true);
    };

    const handleConfirmAccess = async () => {
        if (!pendingQuiz) {
            setIsAccessPromptOpen(false);
            return;
        }

        let expected = String(pendingQuiz.access_code || '').trim().toUpperCase();

        try {
            const latest = await apiService.getQuiz(pendingQuiz.id);
            const quizData = (latest as any)?.quiz || latest;
            if (quizData?.access_code) {
                expected = String(quizData.access_code).trim().toUpperCase();
                setCurrentAccessCode(expected);
                // keep local cache fresh
                setQuizzes((prev) =>
                    prev.map((quiz) =>
                        quiz.id === pendingQuiz.id
                            ? { ...quiz, access_code: expected }
                            : quiz
                    )
                );
            }
        } catch (err) {
            console.warn('Failed to fetch latest quiz info', err);
        }

        const provided = enteredAccessCode.trim().toUpperCase();

        if (!provided) {
            toast.error('Please enter the access code.');
            return;
        }

        if (expected && expected !== provided) {
            toast.error('Invalid access code. Please double-check the latest code from your notification.');
            return;
        }

        const quiz = pendingQuiz;
        setIsAccessPromptOpen(false);
        setPendingQuiz(null);

        // Show welcome modal instead of directly starting quiz
        setWelcomeQuiz(quiz);
        setIsWelcomeModalOpen(true);
    };

    const handleCancelAccess = () => {
        setIsAccessPromptOpen(false);
        setPendingQuiz(null);
        setEnteredAccessCode('');
    };

    if (loading) {
        return (
            <DashboardLayout user={user} onLogout={logout}>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <>
            <DashboardLayout user={user} onLogout={logout}>
                <div className="space-y-6">
                    <div>
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl text-gray-900 dark:text-white">Available Quizzes</h1>
                                <div className="flex items-center gap-4 mt-2">
                                    <p className="text-gray-600 dark:text-gray-400">
                                        Quizzes assigned to your class
                                    </p>
                                    <button
                                        onClick={fetchAllQuizzes}
                                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm font-medium"
                                    >
                                        <FileText className="w-4 h-4" />
                                        View All Quizzes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {quizzes.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h2 className="text-xl text-gray-900 dark:text-white mb-2">No Quizzes Available</h2>
                            <p className="text-gray-600 dark:text-gray-400">
                                There are no quizzes currently assigned to your class.
                            </p>
                            <Link
                                to="/student/quiz-access"
                                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                <Clock className="w-4 h-4" />
                                Enter Access Code
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {quizzes.map((quiz) => {
                                const availability = getAvailabilityInfo(quiz);
                                const remainingAttempts = quiz?.remaining_attempts ?? 0;
                                const canAttemptNow = remainingAttempts > 0 && quiz?.is_available_now;
                                const outOfAttempts = remainingAttempts <= 0;
                                const disabledMessage =
                                    outOfAttempts
                                        ? 'No attempts left'
                                        : availability.description || 'Not currently available';

                                return (
                                    <div
                                        key={quiz.id}
                                        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex items-start gap-3 mb-4">
                                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                                                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-lg text-gray-900 dark:text-white">
                                                        {quiz.title}
                                                    </h3>
                                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${availability.badgeClass}`}>
                                                        {availability.label}
                                                    </span>
                                                    {outOfAttempts && (
                                                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-300">
                                                            Attempts exhausted
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {(quiz.duration_minutes ?? quiz.time_limit_minutes ?? 0)} minutes •{' '}
                                                    {(quiz.questions?.length ?? quiz.total_questions ?? 0)} questions
                                                </p>
                                                {availability.description && (
                                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                        {availability.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-3 mb-4">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">Remaining Attempts</span>
                                                <span className={outOfAttempts ? 'font-semibold text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white font-medium'}>
                                                    {remainingAttempts}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">Max Score</span>
                                                <span className="text-gray-900 dark:text-white font-medium">
                                                    {quiz.max_score || quiz.total_marks || 0} points
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">Available Window</span>
                                                <span className="text-right text-gray-900 dark:text-white font-medium">
                                                    {formatDateTime(quiz.available_from) || '—'}
                                                    {quiz.available_until ? ` → ${formatDateTime(quiz.available_until)}` : ''}
                                                </span>
                                            </div>
                                            {quiz.latest_attempt && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">Last Score</span>
                                                    <span
                                                        className={`font-medium ${quiz.latest_attempt.score >= 80
                                                            ? 'text-green-600'
                                                            : quiz.latest_attempt.score >= 60
                                                                ? 'text-yellow-600'
                                                                : 'text-red-600'
                                                            }`}
                                                    >
                                                        {quiz.latest_attempt.score}%
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <button
                                                onClick={() => openAccessPrompt(quiz)}
                                                disabled={!canAttemptNow}
                                                className={canAttemptNow
                                                    ? 'w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors'
                                                    : 'w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed'}
                                            >
                                                <Play className="w-4 h-4" />
                                                {canAttemptNow ? 'Start Quiz' : disabledMessage}
                                            </button>
                                            {!canAttemptNow && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                                    {disabledMessage}
                                                </p>
                                            )}

                                            {quiz.latest_attempt && (
                                                <Link
                                                    to={`/student/result/${quiz.latest_attempt.id}`}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                    View Last Result
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Quick Access */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                        <h2 className="text-lg text-gray-900 dark:text-white mb-4">Quick Access</h2>
                        <div className="flex flex-wrap gap-4">
                            <Link
                                to="/student/quiz-access"
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                <Clock className="w-4 h-4" />
                                Enter Quiz Access Code
                            </Link>
                            <button
                                onClick={fetchAllQuizzes}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                            >
                                <FileText className="w-4 h-4" />
                                View All Quizzes
                            </button>
                        </div>
                    </div>
                </div>
            </DashboardLayout>

            {isAccessPromptOpen && pendingQuiz && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Enter Access Code</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            Please enter the access code for <span className="font-medium text-gray-900 dark:text-white">{pendingQuiz.title}</span> to begin.
                        </p>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="access-code-input">
                                Access Code
                            </label>
                            <input
                                id="access-code-input"
                                type="text"
                                value={enteredAccessCode}
                                onChange={(e) => setEnteredAccessCode(e.target.value.toUpperCase())}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="ENTER CODE"
                                autoFocus
                            />
                            {currentAccessCode && (
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    Latest access code on file: <span className="font-semibold text-gray-700 dark:text-gray-200">{currentAccessCode}</span>
                                </p>
                            )}
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={handleCancelAccess}
                                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmAccess}
                                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                Start Quiz
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quiz Welcome Modal */}
            <QuizWelcomeModal
                isOpen={isWelcomeModalOpen}
                onClose={() => {
                    setIsWelcomeModalOpen(false);
                    setWelcomeQuiz(null);
                }}
                quiz={welcomeQuiz}
                onStartQuiz={handleStartQuizAttempt}
            />

            {/* All Quizzes Modal */}
            {showAllQuizzesModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[80vh] p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">All Quizzes</h3>
                            <button
                                onClick={() => setShowAllQuizzesModal(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="overflow-y-auto max-h-[60vh]">
                            {allQuizzes.length === 0 ? (
                                <div className="text-center py-8">
                                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600 dark:text-gray-400">No quizzes found</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {allQuizzes.map((quiz) => {
                                        const availability = getAvailabilityInfo(quiz);
                                        const isCompleted = quiz?.latest_attempt;

                                        return (
                                            <div key={quiz.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <h4 className="text-lg font-medium text-gray-900 dark:text-white">{quiz.title}</h4>
                                                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${availability.badgeClass}`}>
                                                                {availability.label}
                                                            </span>
                                                            {isCompleted && (
                                                                <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                                                                    Completed
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                                            {(quiz.duration_minutes ?? quiz.time_limit_minutes ?? 0)} minutes • {(quiz.questions?.length ?? quiz.total_questions ?? 0)} questions
                                                        </p>
                                                        {availability.description && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                {availability.description}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        {isCompleted ? (
                                                            <Link
                                                                to={`/student/result/${quiz.latest_attempt.id}`}
                                                                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                                                            >
                                                                <FileText className="w-4 h-4" />
                                                                View Result
                                                            </Link>
                                                        ) : quiz?.is_available_now ? (
                                                            <button
                                                                onClick={() => {
                                                                    setShowAllQuizzesModal(false);
                                                                    openAccessPrompt(quiz);
                                                                }}
                                                                className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                                                            >
                                                                <Play className="w-4 h-4" />
                                                                Start Quiz
                                                            </button>
                                                        ) : (
                                                            <button
                                                                disabled
                                                                className="inline-flex items-center gap-2 px-3 py-2 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-lg text-sm cursor-not-allowed"
                                                            >
                                                                <Clock className="w-4 h-4" />
                                                                {availability.label}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
