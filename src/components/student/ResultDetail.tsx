import { useParams, Link } from 'react-router-dom';
import DashboardLayout from '../shared/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { quizAttempts, quizzes } from '../../lib/mockData';

export default function ResultDetail() {
  const { currentUser: user, logout } = useAuth();

  if (!user) {
    return <div>Loading...</div>;
  }
  const { attemptId } = useParams();
  const attempt = quizAttempts.find(a => a.id === attemptId);
  const quiz = attempt ? quizzes.find(q => q.id === attempt.quizId) : null;

  if (!attempt || !quiz) {
    return (
      <DashboardLayout user={user} onLogout={logout}>
        <div className="text-center py-12">
          <h2 className="text-2xl text-gray-900 dark:text-white mb-4">Result not found</h2>
          <Link to="/student/results" className="text-blue-600 hover:text-blue-700">
            Go back to results
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const percentage = Math.round((attempt.score / attempt.totalMarks) * 100);

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
          <h1 className="text-3xl text-gray-900 dark:text-white">{quiz.title}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Detailed feedback and results</p>
        </div>

        {/* Score Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg text-gray-900 dark:text-white mb-2">Your Score</h2>
              <div className="text-4xl text-blue-600 dark:text-blue-400">{percentage}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {attempt.score} out of {attempt.totalMarks} marks
              </div>
            </div>
            <div className={`px-8 py-4 rounded-lg ${percentage >= 80 ? 'bg-green-100 dark:bg-green-900/20' :
              percentage >= 60 ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                'bg-red-100 dark:bg-red-900/20'
              }`}>
              <div className={`text-2xl ${percentage >= 80 ? 'text-green-600 dark:text-green-400' :
                percentage >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-red-600 dark:text-red-400'
                }`}>
                {percentage >= 80 ? 'Excellent!' : percentage >= 60 ? 'Good!' : 'Keep Trying!'}
              </div>
            </div>
          </div>
        </div>

        {/* Questions and Answers */}
        <div className="space-y-4">
          {quiz.questions.map((question, index) => {
            const studentAnswer = attempt.answers.find(a => a.questionId === question.id);
            const isCorrect = question.type === 'mcq' && studentAnswer?.answer === question.correctAnswer;

            return (
              <div
                key={question.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${question.type === 'mcq'
                    ? isCorrect
                      ? 'bg-green-100 dark:bg-green-900/20'
                      : 'bg-red-100 dark:bg-red-900/20'
                    : 'bg-blue-100 dark:bg-blue-900/20'
                    }`}>
                    {question.type === 'mcq' ? (
                      isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      )
                    ) : (
                      <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg text-gray-900 dark:text-white mb-1">
                          Question {index + 1}
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300">{question.text}</p>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Marks</div>
                        <div className="text-lg text-gray-900 dark:text-white">
                          {studentAnswer?.marksAwarded || 0}/{question.marks}
                        </div>
                      </div>
                    </div>

                    {question.type === 'mcq' && question.options && (
                      <div className="space-y-2 mb-4">
                        {question.options.map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className={`p-3 rounded-lg border-2 ${optIndex === question.correctAnswer
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                              : optIndex === studentAnswer?.answer
                                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                : 'border-gray-200 dark:border-gray-700'
                              }`}
                          >
                            <span className="text-gray-900 dark:text-white">{option}</span>
                            {optIndex === question.correctAnswer && (
                              <span className="ml-2 text-sm text-green-600 dark:text-green-400">
                                (Correct Answer)
                              </span>
                            )}
                            {optIndex === studentAnswer?.answer && optIndex !== question.correctAnswer && (
                              <span className="ml-2 text-sm text-red-600 dark:text-red-400">
                                (Your Answer)
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {question.type === 'descriptive' && (
                      <div className="space-y-4">
                        <div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Your Answer:</div>
                          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                              {studentAnswer?.answer as string || 'No answer provided'}
                            </p>
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
        </div>
      </div>
    </DashboardLayout>
  );
}
