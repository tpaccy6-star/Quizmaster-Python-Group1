import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { ArrowLeft, Save } from 'lucide-react';
import { quizzes, students } from '../../lib/mockData';
import { toast } from 'sonner@2.0.3';

interface GradingInterfaceProps {
  attempt: any;
  onComplete: () => void;
  onBack: () => void;
}

interface QuestionGrade {
  marks: number;
  feedback: string;
}

export default function GradingInterface({ attempt, onComplete, onBack }: GradingInterfaceProps) {
  const [grades, setGrades] = useState<Record<string, QuestionGrade>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const quiz = quizzes.find(q => q.id === attempt.quizId);
  const student = students.find(s => s.id === attempt.studentId);
  const descriptiveQuestions = quiz?.questions.filter(q => q.type === 'descriptive') || [];

  if (descriptiveQuestions.length === 0) {
    return (
      <div className="bg-card p-6 rounded-lg border text-center">
        <p className="text-muted-foreground">No descriptive questions to grade</p>
        <Button onClick={onBack} className="mt-4">
          Back to Attempts
        </Button>
      </div>
    );
  }

  const currentQuestion = descriptiveQuestions[currentQuestionIndex];
  const answer = attempt.answers?.find((a: any) => a.questionId === currentQuestion.id);

  const handleGrade = (questionId: string, marks: number, feedback: string) => {
    setGrades({
      ...grades,
      [questionId]: { marks, feedback }
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < descriptiveQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitGrades = () => {
    // Validate all questions are graded
    const ungradedQuestions = descriptiveQuestions.filter(
      q => !grades[q.id] || grades[q.id].marks === undefined
    );

    if (ungradedQuestions.length > 0) {
      toast.error(`Please grade all ${ungradedQuestions.length} remaining question(s)`);
      return;
    }

    // Update attempt with grades
    if (attempt.answers) {
      attempt.answers.forEach((ans: any) => {
        if (grades[ans.questionId]) {
          ans.marksAwarded = grades[ans.questionId].marks;
          ans.feedback = grades[ans.questionId].feedback;
        }
      });
    }

    // Calculate total score (MCQ auto-graded + descriptive manual grades)
    const mcqScore = attempt.answers
      ?.filter((a: any) => {
        const q = quiz?.questions.find(qu => qu.id === a.questionId);
        return q?.type === 'mcq' && a.marksAwarded !== undefined;
      })
      .reduce((sum: number, a: any) => sum + (a.marksAwarded || 0), 0) || 0;

    const descriptiveScore = Object.values(grades).reduce(
      (sum, g) => sum + (g.marks || 0),
      0
    );

    attempt.score = mcqScore + descriptiveScore;
    attempt.status = 'graded';
    attempt.gradedAt = new Date().toISOString();
    attempt.gradedBy = 'teacher'; // Add actual teacher ID if needed

    toast.success('Grading completed successfully!');
    onComplete();
  };

  const currentGrade = grades[currentQuestion.id] || { marks: 0, feedback: '' };
  const progress = ((currentQuestionIndex + 1) / descriptiveQuestions.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl">Grading Interface</h2>
            <p className="text-sm text-muted-foreground">
              {student?.name} • {quiz?.title}
            </p>
          </div>
        </div>
        <Button onClick={handleSubmitGrades}>
          <Save className="w-4 h-4 mr-2" />
          Submit All Grades
        </Button>
      </div>

      {/* Progress */}
      <div className="bg-card p-4 rounded-lg border">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>Question {currentQuestionIndex + 1} of {descriptiveQuestions.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-card rounded-xl p-6 border">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline">Descriptive</Badge>
              <Badge>Q{quiz?.questions.findIndex(q => q.id === currentQuestion.id)! + 1}</Badge>
            </div>
            <h3 className="text-lg mb-2">{currentQuestion.text}</h3>
            <p className="text-sm text-muted-foreground">
              Maximum Marks: {currentQuestion.marks}
            </p>
          </div>
        </div>

        {/* Student's Answer */}
        <div className="mb-6">
          <Label className="text-base mb-2">Student&apos;s Answer:</Label>
          <div className="bg-muted p-4 rounded-lg mt-2">
            <p className="whitespace-pre-wrap">
              {answer?.answer || 'No answer provided'}
            </p>
          </div>
        </div>

        {/* Grading Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="marks">Marks Awarded *</Label>
            <Input
              id="marks"
              type="number"
              min={0}
              max={currentQuestion.marks}
              placeholder="0"
              value={currentGrade.marks || ''}
              onChange={(e) =>
                handleGrade(
                  currentQuestion.id,
                  Number(e.target.value),
                  currentGrade.feedback
                )
              }
            />
            <p className="text-xs text-muted-foreground mt-1">
              Max: {currentQuestion.marks} marks
            </p>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="feedback">Feedback (Optional)</Label>
            <Textarea
              id="feedback"
              placeholder="Provide feedback to the student..."
              value={currentGrade.feedback}
              onChange={(e) =>
                handleGrade(
                  currentQuestion.id,
                  currentGrade.marks,
                  e.target.value
                )
              }
              rows={4}
            />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          Previous Question
        </Button>

        <div className="text-sm text-muted-foreground">
          {Object.keys(grades).length} / {descriptiveQuestions.length} graded
        </div>

        <Button
          onClick={handleNext}
          disabled={currentQuestionIndex === descriptiveQuestions.length - 1}
        >
          Next Question
        </Button>
      </div>

      {/* Quick Grade Summary */}
      <div className="bg-muted/50 p-4 rounded-lg">
        <h4 className="text-sm font-medium mb-3">Grading Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {descriptiveQuestions.map((q, idx) => (
            <div
              key={q.id}
              className={`p-3 rounded border-2 cursor-pointer transition-colors ${
                idx === currentQuestionIndex
                  ? 'border-primary bg-primary/5'
                  : grades[q.id]
                  ? 'border-green-500 bg-green-500/5'
                  : 'border-muted-foreground/20'
              }`}
              onClick={() => setCurrentQuestionIndex(idx)}
            >
              <div className="text-xs text-muted-foreground">Q{idx + 1}</div>
              <div className="text-sm font-medium">
                {grades[q.id]?.marks !== undefined
                  ? `${grades[q.id].marks}/${q.marks}`
                  : 'Not graded'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
