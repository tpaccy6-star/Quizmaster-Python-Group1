import { useState, useEffect } from 'react';
import DashboardLayout from '../shared/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, BookOpen, Edit, Trash2, Search, Filter } from 'lucide-react';
import { apiService } from '../../lib/api';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Badge } from '../ui/badge';

export default function QuestionBank() {
  const { currentUser: user, logout } = useAuth();

  if (!user) {
    return <div>Loading...</div>;
  }

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterTopic, setFilterTopic] = useState<string>('all');
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);

  // Form states
  const [type, setType] = useState<'mcq' | 'descriptive'>('mcq');
  const [text, setText] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [marks, setMarks] = useState(1);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await apiService.getQuestionBank();
        console.log('QuestionBank page - Full response:', response);
        console.log('QuestionBank page - Response type:', typeof response);
        console.log('QuestionBank page - Response keys:', Object.keys(response || {}));

        if ((response as any).questions && Array.isArray((response as any).questions)) {
          console.log('QuestionBank page - Found questions in response.questions:', (response as any).questions);
          console.log('QuestionBank page - Number of questions:', (response as any).questions.length);
          setQuestions((response as any).questions);
        } else if (response.data && Array.isArray(response.data)) {
          console.log('QuestionBank page - Found questions in response.data:', response.data);
          console.log('QuestionBank page - Number of questions:', response.data.length);
          setQuestions(response.data);
        } else if (Array.isArray(response)) {
          console.log('QuestionBank page - Response is directly array:', response);
          console.log('QuestionBank page - Number of questions:', response.length);
          setQuestions(response);
        } else {
          console.log('QuestionBank page - No questions found');
          console.log('QuestionBank page - Response structure:', JSON.stringify(response, null, 2));
        }
      } catch (error) {
        console.error('QuestionBank page - Error:', error);
        toast.error('Failed to load questions');
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  if (loading) {
    return (
      <DashboardLayout user={user} onLogout={logout}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Filter questions
  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.topic.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || q.type === filterType;
    const matchesDifficulty = filterDifficulty === 'all' || q.difficulty === filterDifficulty;
    return matchesSearch && matchesType && matchesDifficulty;
  });

  const resetForm = () => {
    setType('mcq');
    setText('');
    setTopic('');
    setDifficulty('medium');
    setMarks(1);
    setOptions(['', '', '', '']);
    setCorrectAnswer(0);
    setSelectedQuestion(null);
  };

  const handleCreate = async () => {
    if (!text.trim() || !topic.trim()) {
      toast.error('Question text and topic are required');
      return;
    }

    if (type === 'mcq' && options.some(opt => !opt.trim())) {
      toast.error('Please fill all options');
      return;
    }

    const newQuestion = {
      type,
      text,
      topic,
      difficulty,
      marks,
      ...(type === 'mcq' && { options, correct_answer: correctAnswer }),
    };

    try {
      const response = await apiService.createQuestion(newQuestion);
      console.log('Create question response:', response);

      // Handle different response structures
      let createdQuestion = null;
      if (response.data) {
        createdQuestion = response.data;
      } else if (response.question) {
        createdQuestion = response.question;
      } else if (response.id) {
        createdQuestion = response;
      }

      if (createdQuestion) {
        setQuestions([...questions, createdQuestion]);
        toast.success('Question added to bank');
        resetForm();
        setShowCreateDialog(false);
      } else {
        toast.error('Failed to create question - invalid response');
      }
    } catch (error) {
      console.error('Create question error:', error);
      toast.error('Failed to create question');
    }
  };

  const handleEdit = async () => {
    if (!text.trim() || !topic.trim()) {
      toast.error('Question text and topic are required');
      return;
    }

    if (type === 'mcq' && options.some(opt => !opt.trim())) {
      toast.error('Please fill all options');
      return;
    }

    const updatedQuestion = {
      type,
      text,
      topic,
      difficulty,
      marks,
      ...(type === 'mcq' && { options, correct_answer: correctAnswer }),
    };

    try {
      const response = await apiService.updateQuestion(selectedQuestion.id, updatedQuestion);
      console.log('Update question response:', response);

      // Handle different response structures
      let updatedQuestionData = null;
      if (response.data) {
        updatedQuestionData = response.data;
      } else if (response.question) {
        updatedQuestionData = response.question;
      } else if (response.id) {
        updatedQuestionData = response;
      }

      if (updatedQuestionData) {
        setQuestions(questions.map(q => q.id === selectedQuestion.id ? updatedQuestionData : q));
        toast.success('Question updated');
        resetForm();
        setShowEditDialog(false);
      } else {
        toast.error('Failed to update question - invalid response');
      }
    } catch (error) {
      console.error('Update question error:', error);
      toast.error('Failed to update question');
    }
  };

  const handleDelete = async () => {
    try {
      const response = await apiService.deleteQuestion(selectedQuestion.id);
      console.log('Delete question response:', response);

      if (response.success || response.status === 'success' || !response.error) {
        setQuestions(questions.filter(q => q.id !== selectedQuestion.id));
        toast.success('Question deleted');
        resetForm();
        setShowDeleteDialog(false);
      } else {
        toast.error('Failed to delete question');
      }
    } catch (error) {
      console.error('Delete question error:', error);
      toast.error('Failed to delete question');
    }
  };

  const openEditDialog = (question: any) => {
    setSelectedQuestion(question);
    setType(question.type);
    setText(question.text);
    setTopic(question.topic);
    setDifficulty(question.difficulty);
    setMarks(question.marks);
    if (question.type === 'mcq') {
      setOptions(question.options || ['', '', '', '']);
      setCorrectAnswer(question.correctAnswer || 0);
    }
    setShowEditDialog(true);
  };

  return (
    <DashboardLayout user={user} onLogout={logout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl">Question Bank</h1>
            <p className="text-muted-foreground mt-1">
              Manage your reusable question library
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Question
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="mcq">MCQ</SelectItem>
              <SelectItem value="descriptive">Descriptive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card p-4 rounded-lg border">
            <div className="text-sm text-muted-foreground">Total Questions</div>
            <div className="text-2xl mt-1">{questions.length}</div>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <div className="text-sm text-muted-foreground">MCQ</div>
            <div className="text-2xl mt-1">{questions.filter(q => q.type === 'mcq').length}</div>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <div className="text-sm text-muted-foreground">Descriptive</div>
            <div className="text-2xl mt-1">{questions.filter(q => q.type === 'descriptive').length}</div>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <div className="text-sm text-muted-foreground">Filtered</div>
            <div className="text-2xl mt-1">{filteredQuestions.length}</div>
          </div>
        </div>

        {/* Questions List */}
        <div className="grid gap-4">
          {filteredQuestions.length > 0 ? (
            filteredQuestions.map((q) => (
              <div key={q.id} className="bg-card rounded-xl p-6 border">
                <div className="flex items-start gap-4">
                  <BookOpen className="w-5 h-5 text-primary mt-1" />
                  <div className="flex-1">
                    <p className="mb-3">{q.text}</p>
                    {q.type === 'mcq' && q.options && (
                      <div className="space-y-1 mb-3 text-sm text-muted-foreground">
                        {q.options.map((opt: any, i: number) => (
                          <div key={i} className={i === q.correctAnswer ? 'text-green-600 font-medium' : ''}>
                            {String.fromCharCode(65 + i)}. {opt}
                            {i === q.correctAnswer && ' ✓'}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Badge variant="outline">{q.topic}</Badge>
                      <Badge variant={
                        q.difficulty === 'easy' ? 'default' :
                          q.difficulty === 'medium' ? 'secondary' :
                            'destructive'
                      }>
                        {q.difficulty}
                      </Badge>
                      <Badge>{q.type === 'mcq' ? 'Multiple Choice' : 'Descriptive'}</Badge>
                      <Badge variant="outline">{q.marks} marks</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(q)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedQuestion(q);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-card p-12 rounded-lg border text-center text-muted-foreground">
              No questions found. Add your first question to get started.
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open: boolean) => {
        if (!open) {
          resetForm();
          setShowCreateDialog(false);
          setShowEditDialog(false);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{showEditDialog ? 'Edit Question' : 'Add New Question'}</DialogTitle>
            <DialogDescription>
              {showEditDialog ? 'Update question details' : 'Create a new question for your bank'}
            </DialogDescription>
          </DialogHeader>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Topic *</Label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Algebra"
                />
              </div>
              <div>
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={(v: 'easy' | 'medium' | 'hard') => setDifficulty(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Marks</Label>
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
                  {options.map((opt: any, i: number) => (
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
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              resetForm();
              setShowCreateDialog(false);
              setShowEditDialog(false);
            }}>
              Cancel
            </Button>
            <Button onClick={showEditDialog ? handleEdit : handleCreate}>
              {showEditDialog ? 'Update' : 'Add'} Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
