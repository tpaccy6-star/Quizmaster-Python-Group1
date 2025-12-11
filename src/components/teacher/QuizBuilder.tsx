import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../shared/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Save, Edit, Trash2, Copy, FileText, Users, Clock, Settings, ArrowLeft, AlertCircle, Book } from 'lucide-react';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { apiService } from '../../lib/api';
import { toast } from 'sonner';
import type { Quiz } from '../../lib/mockData';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import QuizSettings from './QuizSettings';

export default function QuizBuilder() {
  const { currentUser: user, logout } = useAuth();
  const { quizId } = useParams<{ quizId?: string }>();
  const navigate = useNavigate();
  const isEditing = !!quizId;
  const id = quizId; // Keep existing variable name for compatibility

  if (!user) {
    return <div>Loading...</div>;
  }

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [timeLimit, setTimeLimit] = useState(60);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'settings'>('basic');
  const [quizStatus, setQuizStatus] = useState<'draft' | 'published' | 'archived'>('draft');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<'publish' | 'draft' | null>(null);

  // Quiz settings state
  const [quizSettings, setQuizSettings] = useState({
    // Time Settings
    start_date: '',
    end_date: '',
    allow_late_submissions: false,  // Restrictive: No late submissions

    // Attempt Settings
    max_attempts: 1,  // Restrictive: Only one attempt
    retake_policy: 'highest',
    show_correct_answers: false,  // Restrictive: Don't show correct answers

    // Security Settings
    prevent_tab_switching: true,  // Restrictive: Prevent tab switching
    require_fullscreen: true,  // Restrictive: Require fullscreen
    enable_camera_monitoring: true,  // Restrictive: Enable camera monitoring

    // Display Settings
    show_questions_one_at_a_time: true,  // Restrictive: One question at a time
    show_progress_bar: false,  // Restrictive: No progress bar
    randomize_questions: true,  // Restrictive: Randomize questions
    randomize_options: true,  // Restrictive: Randomize options

    // Grading Settings
    passing_percentage: 70,  // Restrictive: Higher passing percentage
    enable_auto_grading: true,
    allow_partial_credit: false,  // Restrictive: No partial credit

    // Access Settings
    password_protection: true,  // Restrictive: Require password
    quiz_password: '',
    allowed_ip_addresses: '',  // Restrictive: No IP restrictions (empty means none)
    require_access_code: true,  // Restrictive: Require access code

    // Existing basic settings
    show_answers_after_submission: false,  // Restrictive: Don't show answers after submission
    allow_review: false,  // Restrictive: Don't allow review
  });

  // Load teacher's classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await apiService.getTeacherClasses();
        const classesData = (response as any).classes || response.data || response || [];
        setClasses(Array.isArray(classesData) ? classesData : []);
      } catch (error) {
        toast.error('Failed to load classes');
      }
    };
    fetchClasses();
  }, []);

  // Load quiz data if editing
  useEffect(() => {
    if (isEditing && id) {
      setLoading(true);
      const fetchQuiz = async () => {
        try {
          // Validate quiz ID before making request
          if (!id || typeof id !== 'string' || id.trim() === '') {
            throw new Error('Invalid quiz ID provided');
          }

          // Use teacher-specific endpoint for fetching quiz
          let response;
          try {
            console.log('Attempting to fetch quiz with ID:', id);
            response = await apiService.getTeacherQuiz(id, true);
          } catch (teacherError) {
            console.warn('Teacher quiz endpoint failed, trying general endpoint:', teacherError);
            // Check if it's a network error (backend not running)
            if (teacherError instanceof TypeError && teacherError.message === 'Failed to fetch') {
              throw new Error('Unable to connect to the server. Please ensure the backend is running on http://127.0.0.1:5000');
            }
            // Fallback to general quiz endpoint
            response = await apiService.getQuiz(id, true);
          }
          console.log('Quiz edit response:', response);

          // Handle different response structures
          let quiz = null;
          if (response.data && typeof response.data === 'object') {
            quiz = response.data;
          } else if ((response as any).quiz && typeof (response as any).quiz === 'object') {
            quiz = (response as any).quiz;
          } else if (typeof response === 'object' && response !== null) {
            quiz = response;
          }

          console.log('Extracted quiz data:', quiz);
          console.log('All quiz properties:', Object.keys(quiz || {}));

          if (quiz) {
            setTitle(quiz.title || '');
            setDescription(quiz.description || '');
            setSubject(quiz.subject || '');
            setTimeLimit(quiz.time_limit_minutes || quiz.time_limit || 60);
            setStartDate(quiz.start_date || '');
            setEndDate(quiz.end_date || '');
            setSelectedClasses(Array.isArray(quiz.class_ids) ? quiz.class_ids : []);

            // Set quiz status
            setQuizStatus(quiz.status || 'draft');

            // Load all quiz settings
            setQuizSettings({
              // Time Settings
              start_date: quiz.start_date || '',
              end_date: quiz.end_date || '',
              allow_late_submissions: quiz.allow_late_submissions || false,

              // Attempt Settings
              max_attempts: quiz.max_attempts || 1,
              retake_policy: quiz.retake_policy || 'highest',
              show_correct_answers: quiz.show_correct_answers || false,

              // Security Settings
              prevent_tab_switching: quiz.prevent_tab_switching || false,
              require_fullscreen: quiz.require_fullscreen || false,
              enable_camera_monitoring: quiz.enable_camera_monitoring || false,

              // Display Settings
              show_questions_one_at_a_time: quiz.show_questions_one_at_a_time || false,
              show_progress_bar: quiz.show_progress_bar !== false, // default true
              randomize_questions: quiz.randomize_questions || false,
              randomize_options: quiz.randomize_options || false,

              // Grading Settings
              passing_percentage: quiz.passing_percentage || 40,
              enable_auto_grading: quiz.enable_auto_grading !== false, // default true
              allow_partial_credit: quiz.allow_partial_credit !== false, // default true

              // Access Settings
              password_protection: quiz.password_protection || false,
              quiz_password: quiz.quiz_password || '',
              allowed_ip_addresses: quiz.allowed_ip_addresses || '',
              require_access_code: quiz.require_access_code !== false, // default true

              // Existing basic settings
              show_answers_after_submission: quiz.show_answers_after_submission || false,
              allow_review: quiz.allow_review !== false, // default true
            });

            // Handle questions from different response structures
            let questionsData = [];
            console.log('Checking for questions in different locations:');

            if (Array.isArray(quiz.questions)) {
              questionsData = quiz.questions;
              console.log('Found questions in quiz.questions:', questionsData);
            } else if (Array.isArray(quiz.question_items)) {
              questionsData = quiz.question_items;
              console.log('Found questions in quiz.question_items:', questionsData);
            } else if (Array.isArray(quiz.items)) {
              questionsData = quiz.items;
              console.log('Found questions in quiz.items:', questionsData);
            } else if (quiz.questions && Array.isArray(quiz.questions.data)) {
              questionsData = quiz.questions.data;
              console.log('Found questions in quiz.questions.data:', questionsData);
            } else if (quiz.questions && typeof quiz.questions === 'object') {
              console.log('quiz.questions is object, keys:', Object.keys(quiz.questions));
              // Check if questions are nested under a different property
              for (const key of Object.keys(quiz.questions)) {
                if (Array.isArray((quiz.questions as any)[key])) {
                  questionsData = (quiz.questions as any)[key];
                  console.log(`Found questions in quiz.questions.${key}:`, questionsData);
                  break;
                }
              }
            }

            // A more robust check for questions
            if (Array.isArray(quiz.questions)) {
              questionsData = quiz.questions;
            } else {
              // If the primary `questions` property isn't an array, ensure we default to an empty one.
              questionsData = [];
            }

            console.log('Questions found:', questionsData);
            setQuestions(questionsData);
          } else {
            toast.error('Quiz data not found in response');
          }
        } catch (error) {
          console.error('Failed to load quiz:', error);
          if (error instanceof TypeError && error.message === 'Failed to fetch') {
            toast.error('Unable to connect to the server. Please ensure the backend is running on http://127.0.0.1:5000');
          } else if (error instanceof Error && error.message.includes('Unable to connect to the server')) {
            toast.error(error.message);
          } else {
            toast.error(`Failed to load quiz: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        } finally {
          setLoading(false);
        }
      };

      fetchQuiz();
    }
  }, [isEditing, id]);

  const toggleClassSelection = (classId: string) => {
    setSelectedClasses(prev =>
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const addQuestions = (questionsToAdd: any[]) => {
    console.log('addQuestions called with:', questionsToAdd);
    // Ensure questions have required fields
    const processedQuestions = questionsToAdd.map(q => ({
      ...q,
      id: q.id || `q${Date.now()}_${Math.random()}`,
      topic: q.topic || 'General',
      difficulty: q.difficulty || 'medium',
      marks: q.marks || 1
    }));
    console.log('Processed questions:', processedQuestions);
    setQuestions(prev => [...prev, ...processedQuestions]);
  };

  const addQuestion = (question: any) => {
    if (editingQuestion) {
      // Update existing question
      setQuestions(questions.map(q => q.id === editingQuestion.id ? { ...question, id: editingQuestion.id } : q));
    } else {
      // Add new question
      const mockDataQuestion: import('../../lib/mockData').Question = {
        ...question,
        id: `q${Date.now()}`,
        topic: 'General', // Add required topic field
        difficulty: 'medium' as const, // Add required difficulty field
      };
      setQuestions([...questions, mockDataQuestion]);
    }
    setShowQuestionForm(false);
    setEditingQuestion(null);
  };

  const removeQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
  };

  const editQuestion = (question: any) => {
    setEditingQuestion(question);
    setShowQuestionForm(true);
  };

  const handleSaveDraft = async () => {
    if (!validateForm()) return;

    // Show confirmation if editing an already published quiz
    if (isEditing && quizStatus === 'published') {
      setPendingAction('draft');
      setShowConfirmDialog(true);
      return;
    }

    await executeSaveDraft();
  };

  const executeSaveDraft = async () => {
    const quizData = {
      title,
      description,
      subject,
      time_limit_minutes: timeLimit, // Fixed: API expects time_limit_minutes
      class_ids: selectedClasses,
      questions,
      status: 'draft',
      // Include all quiz settings (these will override the basic date fields)
      ...quizSettings
    };

    console.log('Sending quiz data:', quizData); // Debug log

    try {
      if (isEditing && id) {
        const response = await apiService.updateQuiz(id, quizData);
        if (response.regraded_attempts) {
          toast.success(`Quiz draft updated. ${response.regraded_attempts} attempts were re-evaluated.`);
        } else {
          toast.success('Quiz draft updated');
        }
      } else {
        const response = await apiService.createQuiz(quizData);
        if (response.data) {
          toast.success('Quiz draft saved');
        }
      }
      navigate('/teacher/quizzes');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save quiz');
    }
  };

  const handlePublish = async () => {
    if (!validateForm()) return;

    // Show confirmation if editing an already published quiz
    if (isEditing && quizStatus === 'published') {
      setPendingAction('publish');
      setShowConfirmDialog(true);
      return;
    }

    await executePublish();
  };

  const executePublish = async () => {
    const quizData = {
      title,
      description,
      subject,
      time_limit_minutes: timeLimit, // Fixed: API expects time_limit_minutes
      class_ids: selectedClasses,
      questions,
      status: 'published',
      // Include all quiz settings (these will override basic date fields)
      ...quizSettings
    };

    try {
      if (isEditing && id) {
        const response = await apiService.updateQuiz(id, quizData);
        if (response.regraded_attempts) {
          toast.success(`Quiz updated. ${response.regraded_attempts} attempts were re-evaluated.`);
        } else {
          toast.success('Quiz published successfully');
        }
      } else {
        const response = await apiService.createQuiz(quizData);
        if (response.data) {
          toast.success('Quiz published successfully');
        }
      }
      navigate('/teacher/quizzes');
    } catch (error) {
      toast.error('Failed to publish quiz');
    }
  };

  const handleConfirmAction = () => {
    if (pendingAction === 'publish') {
      executePublish();
    } else if (pendingAction === 'draft') {
      executeSaveDraft();
    }
  };

  const validateForm = () => {
    if (!title.trim()) {
      toast.error('Please enter a quiz title');
      return false;
    }
    if (!subject.trim()) {
      toast.error('Please enter a subject');
      return false;
    }
    if (selectedClasses.length === 0) {
      toast.error('Please select at least one class');
      return false;
    }
    if (questions.length === 0) {
      toast.error('Please add at least one question');
      return false;
    }
    if (!startDate || !endDate) {
      toast.error('Please set start and end dates');
      return false;
    }
    return true;
  };

  return (
    <DashboardLayout user={user} onLogout={logout}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/teacher/quizzes')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl">{isEditing ? 'Edit Quiz' : 'Create New Quiz'}</h1>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('basic')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'basic'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              Basic Information
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'settings'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              <Settings className="w-4 h-4" />
              Quiz Settings
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-card rounded-xl p-6 border">
              <h2 className="text-xl mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="title">Quiz Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Mathematics Final Exam"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the quiz"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    placeholder="e.g., Mathematics"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="timeLimit">Time Limit (minutes) *</Label>
                  <Input
                    id="timeLimit"
                    type="number"
                    min={1}
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="startDate">Start Date & Time *</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date & Time *</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Class Assignment */}
            <div className="bg-card rounded-xl p-6 border">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl">Assign to Classes *</h2>
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Select which classes can access this quiz
              </p>
              {classes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  You are not assigned to any classes yet. Contact admin.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {classes.map((cls: any) => (
                    <label
                      key={cls.id}
                      className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedClasses.includes(cls.id)}
                        onChange={() => toggleClassSelection(cls.id)}
                        className="w-4 h-4"
                      />
                      <div>
                        <div className="font-medium">{cls.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {cls.student_count || cls.students?.length || cls.studentIds?.length || 0} students
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Questions */}
            <div className="bg-card rounded-xl p-6 border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl">Questions ({questions.length})</h2>
                <div className="flex gap-2">
                  <Button onClick={() => {
                    setEditingQuestion(null);
                    setShowQuestionForm(true);
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Question
                  </Button>
                  <Button variant="outline" onClick={() => setShowBankModal(true)}>
                    <Book className="w-4 h-4 mr-2" />
                    Add from Bank
                  </Button>
                </div>

                {questions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No questions added yet. Click &quot;Add Question&quot; to start.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questions.map((q, index) => (
                      <div key={q.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                                Q{index + 1}
                              </span>
                              <span className="px-2 py-1 bg-muted rounded text-xs">
                                {q.type === 'mcq' ? 'Multiple Choice' : 'Descriptive'}
                              </span>
                              <span className="px-2 py-1 bg-muted rounded text-xs">
                                {q.marks} marks
                              </span>
                            </div>
                            <p className="mb-2">{q.text}</p>
                            {q.type === 'mcq' && q.options && (
                              <div className="space-y-1">
                                {q.options.map((opt: any, i: any) => (
                                  <div
                                    key={i}
                                    className={`text-sm pl-4 ${i === q.correctAnswer ? 'text-green-600 font-medium' : 'text-muted-foreground'
                                      }`}
                                  >
                                    {String.fromCharCode(65 + i)}. {opt}
                                    {i === q.correctAnswer && ' ✓'}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => editQuestion(q)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeQuestion(q.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-card rounded-xl p-6 border">
            <h2 className="text-xl mb-4">Quiz Settings</h2>
            <QuizSettings
              settings={quizSettings}
              onChange={setQuizSettings}
            />
          </div>
        )}

        {/* Actions - Always visible */}
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate('/teacher/quizzes')}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleSaveDraft}>
            <Save className="w-4 h-4 mr-2" />
            Save as Draft
          </Button>
          <Button onClick={handlePublish}>
            <Plus className="w-4 h-4 mr-2" />
            Publish Quiz
          </Button>
        </div>

        {/* Question Form Modal */}
        {showQuestionForm && (
          <QuestionFormModal
            onClose={() => setShowQuestionForm(false)}
            onAdd={addQuestion}
            editingQuestion={editingQuestion}
          />
        )}

        {/* Question Bank Modal */}
        {showBankModal && (
          <QuestionBankModal
            onClose={() => setShowBankModal(false)}
            onAdd={addQuestions}
            existingQuestions={questions.map(q => q.id)}
          />
        )}

        {/* Confirmation Dialog */}
        <ConfirmDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          title="Update Published Quiz"
          description="You are about to update a published quiz. This will re-evaluate all existing MCQ answers and may affect student scores. Continue?"
          onConfirm={handleConfirmAction}
          confirmText="Update Quiz"
          cancelText="Cancel"
        />
      </div>
    </DashboardLayout >
  );
}

// Question Form Modal Component
// Question Bank Modal Component
function QuestionBankModal({
  onClose,
  onAdd,
  existingQuestions,
}: {
  onClose: () => void;
  onAdd: (questions: any[]) => void;
  existingQuestions: string[];
}) {
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBank = async () => {
      try {
        // Use the same method as QuestionBank component for reading
        const response = await apiService.getQuestionBank();
        console.log('Question bank response:', response);
        console.log('Response type:', typeof response);
        console.log('Response keys:', Object.keys(response || {}));

        // Handle different response structures
        let questions = [];
        if (response.data && Array.isArray(response.data)) {
          questions = response.data;
          console.log('Found questions in response.data:', questions);
        } else if ((response as any).questions && Array.isArray((response as any).questions)) {
          questions = (response as any).questions;
          console.log('Found questions in response.questions:', questions);
        } else if (Array.isArray(response)) {
          questions = response;
          console.log('Response is directly an array:', questions);
        } else if ((response as any).items && Array.isArray((response as any).items)) {
          questions = (response as any).items;
          console.log('Found questions in response.items:', questions);
        } else {
          console.log('No questions found in any expected location');
          // Check if response is an error or empty
          if (response.error) {
            console.error('API returned error:', response.error);
          } else if (response.message) {
            console.log('API message:', response.message);
          }
        }

        console.log('Final questions array:', questions);
        console.log('Number of questions:', questions.length);

        // Log details of each question
        questions.forEach((q: any, index: number) => {
          console.log(`Question ${index}:`, {
            id: q.id,
            text: q.text,
            type: q.type,
            topic: q.topic,
            difficulty: q.difficulty,
            marks: q.marks
          });
        });

        setBankQuestions(questions);
      } catch (error) {
        console.error('Question bank error:', error);
        toast.error('Failed to load question bank');
      } finally {
        setLoading(false);
      }
    };
    fetchBank();
  }, []);

  const toggleSelection = (qId: string) => {
    setSelectedQuestions(prev =>
      prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]
    );
  };

  const handleAdd = () => {
    const questionsToAdd = bankQuestions.filter(q => selectedQuestions.includes(q.id));
    console.log('Adding questions:', questionsToAdd);
    onAdd(questionsToAdd);
    onClose();
    toast.success(`${questionsToAdd.length} question(s) added`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl p-6 max-w-4xl w-full max-h-[90vh] flex flex-col">
        <h3 className="text-xl mb-4">Add from Question Bank</h3>

        <div className="flex-grow overflow-y-auto pr-2">
          {loading ? (
            <p>Loading questions...</p>
          ) : (
            <div className="space-y-3">
              {bankQuestions.map(q => {
                const isSelected = selectedQuestions.includes(q.id);
                const isExisting = existingQuestions.includes(q.id);
                return (
                  <div
                    key={q.id}
                    onClick={() => !isExisting && toggleSelection(q.id)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-primary/20 border-primary' : ''
                      } ${isExisting ? 'bg-muted/50 cursor-not-allowed text-muted-foreground' : 'hover:bg-muted/50'
                      }`}>
                    <p className="font-medium">{q.text}</p>
                    <div className="text-xs text-muted-foreground mt-1">
                      <span>{q.type}</span> | <span>{q.difficulty}</span> | <span>{q.topic}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={selectedQuestions.length === 0}>
            Add Selected ({selectedQuestions.length})
          </Button>
        </div>
      </div>
    </div>
  );
}

// Question Form Modal Component
function QuestionFormModal({
  onClose,
  onAdd,
  editingQuestion,
}: {
  onClose: () => void;
  onAdd: (question: any) => void;
  editingQuestion: any | null;
}) {
  const [type, setType] = useState<'mcq' | 'descriptive' | 'short_answer'>(editingQuestion?.type || 'mcq');
  const [text, setText] = useState(editingQuestion?.text || '');
  const [marks, setMarks] = useState(editingQuestion?.marks || 1);
  const [options, setOptions] = useState(editingQuestion?.options || ['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(editingQuestion?.correctAnswer || 0);
  const [modelAnswer, setModelAnswer] = useState(editingQuestion?.modelAnswer || '');

  const handleSubmit = () => {
    if (!text.trim()) {
      toast.error('Please enter question text');
      return;
    }

    if (type === 'mcq') {
      if (options.some((opt: string) => !opt.trim())) {
        toast.error('Please fill all options');
        return;
      }
      onAdd({
        id: '',
        type,
        text,
        marks,
        options,
        correctAnswer,
      });
    } else {
      onAdd({
        id: '',
        type,
        text,
        marks,
        modelAnswer, // Include model answer for descriptive and short answer questions
      });
    }

    toast.success('Question added');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl mb-4">Add Question</h3>

        <div className="space-y-4">
          <div>
            <Label>Question Type</Label>
            <Select value={type} onValueChange={(v: 'mcq' | 'descriptive' | 'short_answer') => setType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mcq">Multiple Choice</SelectItem>
                <SelectItem value="descriptive">Descriptive</SelectItem>
                <SelectItem value="short_answer">Short Answer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Question Text *</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter your question..."
              rows={3}
            />
          </div>

          <div>
            <Label>Marks *</Label>
            <Input
              type="number"
              min={1}
              value={marks}
              onChange={(e) => setMarks(Number(e.target.value))}
            />
          </div>

          {(type === 'descriptive' || type === 'short_answer') && (
            <div>
              <Label>Model Answer (Optional)</Label>
              <Textarea
                value={modelAnswer}
                onChange={(e) => setModelAnswer(e.target.value)}
                placeholder="Enter a model answer or key points for grading reference..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                This will appear as a template during grading to help provide consistent feedback
              </p>
            </div>
          )}

          {type === 'mcq' && (
            <>
              <div>
                <Label>Options</Label>
                {options.map((opt: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <span className="w-8">{String.fromCharCode(65 + i)}.</span>
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const newOptions = [...options];
                        newOptions[i] = e.target.value;
                        setOptions(newOptions);
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    />
                  </div>
                ))}
              </div>

              <div>
                <Label>Correct Answer</Label>
                <Select value={correctAnswer.toString()} onValueChange={(v: string) => setCorrectAnswer(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((_: string, i: number) => (
                      <SelectItem key={i} value={i.toString()}>
                        Option {String.fromCharCode(65 + i)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>{editingQuestion ? 'Update Question' : 'Add Question'}</Button>
        </div>
      </div>
    </div>
  );
}
