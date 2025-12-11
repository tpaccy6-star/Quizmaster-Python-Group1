import { useState, useMemo } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { apiService } from '../../lib/api';
import { toast } from 'sonner';

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
  const [submitting, setSubmitting] = useState(false);

  const quiz = attempt.quiz;
  const student = attempt.student;
  const answers = attempt.answers || [];

  // Debug logging to see what we're working with
  console.log('Grading attempt:', attempt);
  console.log('Quiz questions:', quiz?.questions);
  console.log('Quiz data:', quiz);
  console.log('Attempt answers:', attempt.answers);

  // Log detailed answer data
  answers.forEach((answer: any, index: number) => {
    console.log(`Answer ${index}:`, {
      question_id: answer.question_id,
      answer_text: answer.answer_text,
      answer_option: answer.answer_option,
      question: answer.question,
      quiz_question: answer.quiz_question
    });
  });

  // Try multiple possible locations for questions
  const quizQuestions = quiz?.questions || quiz?.quiz?.questions || quiz?.data?.questions || [];
  console.log('Found questions from multiple sources:', quizQuestions);

  // Get all questions (not just descriptive/short answer)
  const allQuestions = quizQuestions.filter((q: any) => q) || [];
  const descriptiveQuestions = allQuestions.filter((q: any) => q.type === 'descriptive' || q.type === 'short_answer') || [];
  const mcqQuestions = allQuestions.filter((q: any) => q.type === 'mcq') || [];

  // Check if quiz has questions that require manual grading
  const hasManualGradingQuestions = allQuestions.some((q: any) => q.type === 'descriptive' || q.type === 'short_answer') || false;

  // Also check answers to detect short answer questions if quiz data is incomplete
  const hasShortAnswerAnswers = answers.some((a: any) =>
    a.answer_text && a.answer_option === null
  );

  console.log('Manual grading questions:', hasManualGradingQuestions);
  console.log('Short answer answers:', hasShortAnswerAnswers);
  console.log('Descriptive questions found:', descriptiveQuestions);
  console.log('MCQ questions found:', mcqQuestions);
  console.log('All questions found:', allQuestions);

  if (!hasManualGradingQuestions && !hasShortAnswerAnswers) {
    return (
      <div className="bg-card p-6 rounded-lg border text-center">
        <p className="text-muted-foreground">This quiz only contains MCQ questions and doesn't require manual grading.</p>
        <p className="text-xs text-muted-foreground mt-2">
          Quiz questions: {allQuestions.length} |
          Manual grading: {hasManualGradingQuestions} |
          Short answers: {hasShortAnswerAnswers}
        </p>
        <Button onClick={onBack} className="mt-4">
          Back to Attempts
        </Button>
      </div>
    );
  }

  // Reconstruct questions from attempt answers for consistent display
  const questionsForGrading = useMemo(() => {
    if (!attempt?.answers) return [];

    return attempt.answers.map((answer: any) => {
      const question = {
        id: answer.question_id,
        text: answer.question?.text || answer.question?.question_text || `Question ${answer.question_id}`,
        type: answer.question?.type || (answer.answer_option !== null ? 'mcq' : 'descriptive'),
        marks: answer.question?.marks || 5,
        options: answer.question?.options || [],
        correctAnswer: answer.question?.correct_answer || answer.question?.correctAnswer
      };

      console.log('Reconstructed question for grading:', question);
      return question;
    });
  }, [attempt]);

  const currentQuestion = questionsForGrading[currentQuestionIndex];
  const answer = attempt.answers.find((a: any) => a.question_id === currentQuestion.id);

  const handleGrade = (questionId: string, marks: number, feedback: string) => {
    setGrades({
      ...grades,
      [questionId]: { marks, feedback }
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questionsForGrading.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitGrades = async () => {
    setSubmitting(true);
    try {
      // Check if attempt can be graded
      if (attempt.status === 'graded') {
        toast.error('This attempt has already been graded');
        return;
      }

      if (attempt.status !== 'submitted') {
        toast.error('Attempt must be submitted before grading');
        return;
      }

      const gradesData = Object.entries(grades).map(([questionId, grade]) => ({
        question_id: questionId,
        marks_awarded: grade.marks,
        feedback: grade.feedback
      }));

      console.log('Submitting grades:', gradesData);
      console.log('Attempt status:', attempt.status);

      await apiService.gradeAttempt(attempt.id, gradesData);
      toast.success('Grading completed successfully!');
      onComplete();
    } catch (error: any) {
      console.error('Error submitting grades:', error);
      console.error('Error details:', error.response?.data);
      toast.error(error.response?.data?.message || error.message || 'Failed to submit grades');
    } finally {
      setSubmitting(false);
    }
  };

  const currentGrade = grades[currentQuestion.id] || { marks: 0, feedback: '' };
  const progress = ((currentQuestionIndex + 1) / questionsForGrading.length) * 100;

  // Return the grading interface with reconstructed questions
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
              {student?.name} • {quiz?.title} (Reconstructed Questions)
            </p>
          </div>
        </div>
        <Button onClick={handleSubmitGrades} disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Submit All Grades
            </>
          )}
        </Button>
      </div>

      {/* Progress */}
      <div className="bg-card p-4 rounded-lg border">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>Question {currentQuestionIndex + 1} of {questionsForGrading.length}</span>
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
              <Badge variant="outline">
                {currentQuestion.type === 'mcq' ? 'Multiple Choice' :
                  currentQuestion.type === 'short_answer' ? 'Short Answer' :
                    currentQuestion.type === 'descriptive' ? 'Descriptive' : 'Unknown'}
              </Badge>
              <Badge>Q{currentQuestionIndex + 1}</Badge>
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
            {currentQuestion.type === 'mcq' ? (
              <div>
                {answer?.answer_option !== null ? (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      Selected Option: {String.fromCharCode(65 + (answer?.answer_option || 0))}
                    </span>
                    {currentQuestion.options && (
                      <span className="text-muted-foreground">
                        - {currentQuestion.options[answer?.answer_option || 0]}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No answer provided</p>
                )}
              </div>
            ) : (
              // For descriptive and short answer questions
              answer?.answer_text || answer?.text ? (
                <div
                  className="whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: (answer?.answer_text || answer?.text || '')
                      .replace(/<div>/g, '<br>')
                      .replace(/<\/div>/g, '')
                      .replace(/<h2[^>]*>/g, '<strong>')
                      .replace(/<\/h2>/g, '</strong><br>')
                      .replace(/<br><br>/g, '<br>')
                  }}
                />
              ) : (
                <p className="text-muted-foreground italic">No answer provided</p>
              )
            )}
          </div>
        </div>

        {/* Correct Answer */}
        <div className="mb-6">
          <Label className="text-base mb-2">Correct Answer:</Label>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-2">
            {currentQuestion.type === 'mcq' ? (
              <div className="flex items-center gap-2">
                <span className="font-medium text-green-700 dark:text-green-300">
                  Correct Option: {String.fromCharCode(65 + (currentQuestion.correctAnswer || 0))}
                </span>
                {currentQuestion.options && currentQuestion.options[currentQuestion.correctAnswer || 0] && (
                  <span className="text-green-600 dark:text-green-400">
                    - {currentQuestion.options[currentQuestion.correctAnswer || 0]}
                  </span>
                )}
              </div>
            ) : (
              currentQuestion.modelAnswer ? (
                <div
                  className="whitespace-pre-wrap text-green-700 dark:text-green-300"
                  dangerouslySetInnerHTML={{
                    __html: currentQuestion.modelAnswer
                      .replace(/<div>/g, '<br>')
                      .replace(/<\/div>/g, '')
                      .replace(/<h2[^>]*>/g, '<strong>')
                      .replace(/<\/h2>/g, '</strong><br>')
                      .replace(/<br><br>/g, '<br>')
                  }}
                />
              ) : (
                <p className="text-green-600 dark:text-green-400 italic">
                  No model answer provided - Teacher should evaluate based on question requirements
                </p>
              )
            )}
          </div>
        </div>

        {/* Model Answer Template */}
        {currentQuestion.modelAnswer && (
          <div className="mb-6">
            <Label className="text-base mb-2">Model Answer (Template)</Label>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-2">
              <div
                className="whitespace-pre-wrap text-sm text-blue-800 dark:text-blue-200"
                dangerouslySetInnerHTML={{
                  __html: currentQuestion.modelAnswer
                    .replace(/<div>/g, '<br>')
                    .replace(/<\/div>/g, '')
                    .replace(/<h2[^>]*>/g, '<strong>')
                    .replace(/<\/h2>/g, '</strong><br>')
                    .replace(/<br><br>/g, '<br>')
                }}
              />
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 italic">
                💡 Use this as a template - modify based on student's actual answer
              </p>
            </div>
          </div>
        )}

        {/* Grading Section */}
        {currentQuestion.type === 'mcq' ? (
          // MCQ questions show auto-graded result
          <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <Label className="text-base mb-2">Auto-Graded Result:</Label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">Status:</span>
                <Badge className={
                  answer?.answer_option === currentQuestion.correctAnswer
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }>
                  {answer?.answer_option === currentQuestion.correctAnswer ? 'Correct' : 'Incorrect'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Score:</span>
                <span className={
                  answer?.answer_option === currentQuestion.correctAnswer
                    ? 'text-green-600 dark:text-green-400 font-bold'
                    : 'text-red-600 dark:text-red-400 font-bold'
                }>
                  {answer?.answer_option === currentQuestion.correctAnswer ? currentQuestion.marks : 0}/{currentQuestion.marks}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              MCQ questions are automatically graded based on the correct answer
            </p>
          </div>
        ) : (
          // Descriptive and short answer questions need manual grading
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
                Enter marks from 0 to {currentQuestion.marks}
              </p>
            </div>

            <div>
              <Label htmlFor="feedback">Feedback</Label>
              <Textarea
                id="feedback"
                placeholder="Provide feedback on the student's answer..."
                value={currentGrade.feedback || ''}
                onChange={(e) =>
                  handleGrade(
                    currentQuestion.id,
                    Number(currentGrade.marks || 0),
                    e.target.value
                  )
                }
                rows={4}
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>
          <div className="flex gap-2">
            {questionsForGrading.map((_: any, index: number) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${index === currentQuestionIndex
                  ? 'bg-primary'
                  : 'bg-muted'
                  }`}
              />
            ))}
          </div>
          <Button
            onClick={handleNext}
            disabled={currentQuestionIndex === questionsForGrading.length - 1}
          >
            Next
          </Button>
        </div>
      </div>
    </div >
  );
}
