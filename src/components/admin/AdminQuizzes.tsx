import DashboardLayout from '../shared/DashboardLayout';
import { User } from '../../App';
import { FileText, Trash2, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { apiService } from '../../lib/api';

interface AdminQuizzesProps {
  user: User;
  onLogout: () => void;
}

export default function AdminQuizzes({ user, onLogout }: AdminQuizzesProps) {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const response = await apiService.getQuizzes(1, 50); // Fetch all quizzes
        const quizzesData = (response as any).quizzes || [];
        setQuizzes(quizzesData);
      } catch (error) {
        console.error('Failed to fetch quizzes:', error);
        toast.error('Failed to load quizzes');
        setQuizzes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, []);

  const handleViewQuiz = async (quizId: string) => {
    try {
      const quiz = await apiService.getQuiz(quizId, true); // Include questions
      console.log('Quiz details:', quiz);
      // TODO: Open quiz details modal or navigate to quiz details page
      toast.info('Quiz details feature coming soon');
    } catch (error) {
      console.error('Failed to fetch quiz details:', error);
      toast.error('Failed to load quiz details');
    }
  };

  const handleDeleteQuiz = async (quizId: string, quizTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${quizTitle}"?`)) {
      return;
    }

    try {
      await apiService.deleteQuiz(quizId);
      toast.success(`Quiz "${quizTitle}" deleted successfully`);
      // Refresh quizzes list
      const response = await apiService.getQuizzes(1, 50);
      const quizzesData = (response as any).quizzes || [];
      setQuizzes(quizzesData);
    } catch (error) {
      console.error('Failed to delete quiz:', error);
      toast.error('Failed to delete quiz');
    }
  };

  if (loading) {
    return (
      <DashboardLayout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }
  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl text-gray-900 dark:text-white">All Quizzes</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">System-wide quiz overview</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase">Subject</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase">Questions</th>
                <th className="px-6 py-3 text-right text-xs text-gray-600 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {quizzes.length > 0 ? (
                quizzes.map((quiz) => (
                  <tr key={quiz.id}>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{quiz.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{quiz.subject || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs ${quiz.status === 'published'
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>
                        {quiz.status || 'draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{quiz.questions?.length || 0}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewQuiz(quiz.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                          title="View Quiz"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          title="Delete Quiz"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No quizzes found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
