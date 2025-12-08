import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../shared/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { Save, Plus, Trash2, ArrowLeft, AlertCircle } from 'lucide-react';
import { apiService } from '../../lib/api';
import { toast } from 'sonner';
import type { Quiz } from '../../lib/mockData';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

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
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);

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
          const response = await apiService.getQuiz(id, true);
          if (response.data && typeof response.data === 'object') {
            const quiz = response.data as any;
            setTitle(quiz.title || '');
            setDescription(quiz.description || '');
            setSubject(quiz.subject || '');
            setTimeLimit(quiz.time_limit || 60);
            setStartDate(quiz.start_date || '');
            setEndDate(quiz.end_date || '');
            setSelectedClasses(Array.isArray(quiz.class_ids) ? quiz.class_ids : []);
            setQuestions(Array.isArray(quiz.questions) ? quiz.questions : []);
          }
        } catch (error) {
          toast.error('Failed to load quiz');
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

  const addQuestion = (question: any) => {
    // Convert the local Question interface to match mockData Question type
    const mockDataQuestion: import('../../lib/mockData').Question = {
      ...question,
      id: `q${Date.now()}`,
      topic: 'General', // Add required topic field
      difficulty: 'medium' as const, // Add required difficulty field
    };
    setQuestions([...questions, mockDataQuestion]);
    setShowQuestionForm(false);
  };

  const removeQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
  };

  const handleSaveDraft = async () => {
    if (!validateForm()) return;

    const quizData = {
      title,
      description,
      subject,
      time_limit: timeLimit,
      start_date: startDate,
      end_date: endDate,
      class_ids: selectedClasses,
      questions,
      status: 'draft'
    };

    try {
      if (isEditing && id) {
        await apiService.updateQuiz(id, quizData);
        toast.success('Quiz draft updated');
      } else {
        const response = await apiService.createQuiz(quizData);
        if (response.data) {
          toast.success('Quiz draft saved');
        }
      }
      navigate('/teacher/quizzes');
    } catch (error) {
      toast.error('Failed to save quiz');
    }
  };

  const handlePublish = async () => {
    if (!validateForm()) return;

    const quizData = {
      title,
      description,
      subject,
      time_limit: timeLimit,
      start_date: startDate,
      end_date: endDate,
      class_ids: selectedClasses,
      questions,
      status: 'published'
    };

    try {
      if (isEditing && id) {
        await apiService.updateQuiz(id, quizData);
        toast.success('Quiz published successfully');
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
                      {cls.studentIds?.length || 0} students
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
            <Button onClick={() => setShowQuestionForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Question
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeQuestion(q.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
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
      </div>

      {/* Question Form Modal */}
      {showQuestionForm && (
        <QuestionFormModal
          onClose={() => setShowQuestionForm(false)}
          onAdd={addQuestion}
        />
      )}
    </DashboardLayout>
  );
}

// Question Form Modal Component
function QuestionFormModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (question: any) => void;
}) {
  const [type, setType] = useState<'mcq' | 'descriptive'>('mcq');
  const [text, setText] = useState('');
  const [marks, setMarks] = useState(1);
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0);

  const handleSubmit = () => {
    if (!text.trim()) {
      toast.error('Please enter question text');
      return;
    }

    if (type === 'mcq') {
      if (options.some(opt => !opt.trim())) {
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
            <Select value={type} onValueChange={(v: 'mcq' | 'descriptive') => setType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mcq">Multiple Choice</SelectItem>
                <SelectItem value="descriptive">Descriptive</SelectItem>
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

          {type === 'mcq' && (
            <>
              <div>
                <Label>Options</Label>
                {options.map((opt, i) => (
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
                    {options.map((_, i) => (
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
          <Button onClick={handleSubmit}>Add Question</Button>
        </div>
      </div>
    </div>
  );
}
