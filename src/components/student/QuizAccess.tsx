import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../shared/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { Key, Clock, FileText, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { apiService } from '../../lib/api';
import { toast } from 'sonner';

export default function QuizAccess() {
  const { currentUser: user, logout } = useAuth();

  if (!user) {
    return <div>Loading...</div>;
  }
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAccessQuiz = async () => {
    if (!accessCode.trim()) {
      setError('Please enter an access code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`http://127.0.0.1:5000/api/quizzes/access/${accessCode.trim()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        const quiz = result.data;
        // Check if quiz is active and student is eligible
        if (quiz.status === 'published') {
          navigate(`/student/quiz/${quiz.id}`, { state: { quiz } });
        } else {
          setError('This quiz is not currently available');
        }
      } else {
        setError('Invalid access code');
      }
    } catch (error) {
      setError('Failed to access quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout user={user} onLogout={logout}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl text-gray-900 dark:text-white">Access Quiz</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Enter the access code provided by your teacher
          </p>
        </div>

        {/* Access Code Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
          <form onSubmit={(e) => { e.preventDefault(); handleAccessQuiz(); }} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                <Key className="w-4 h-4 inline mr-2" />
                Quiz Access Code
              </label>
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-2xl tracking-widest uppercase"
                placeholder="ENTER CODE"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors"
            >
              Start Quiz
            </button>
          </form>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
          <h2 className="text-lg text-gray-900 dark:text-white mb-4">Important Instructions</h2>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              <span>The quiz must be taken in fullscreen mode</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              <span>Switching tabs or losing focus will be recorded as a violation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              <span>After 3 violations, the quiz will be automatically submitted</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              <span>Right-click and copy/paste are disabled during the quiz</span>
            </li>
          </ul>
        </div>

      </div>
    </DashboardLayout>
  );
}