import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { AlertTriangle, CheckCircle, Clock, Eye } from 'lucide-react';
import AttemptReset from './AttemptReset';
import { useNavigate } from 'react-router-dom';

interface Attempt {
  id: string;
  studentId: string;
  studentName: string;
  registrationNumber: string;
  attemptNumber: number;
  status: 'in_progress' | 'submitted' | 'graded' | 'auto_submitted';
  score: number | null;
  totalMarks: number;
  percentage: number | null;
  totalViolations: number;
  autoSubmittedDueToViolations: boolean;
  submittedAt: string | null;
  startedAt: string;
}

interface SubmissionManagerProps {
  quizId: string;
  quizTitle: string;
  maxAttempts: number;
  attempts: Attempt[];
  onRefresh: () => void;
}

export default function SubmissionManager({
  quizId,
  quizTitle,
  maxAttempts,
  attempts,
  onRefresh
}: SubmissionManagerProps) {
  const navigate = useNavigate();
  
  // Categorize attempts
  const inProgress = attempts.filter(a => a.status === 'in_progress');
  const autoSubmitted = attempts.filter(a => a.autoSubmittedDueToViolations);
  const manualSubmitted = attempts.filter(a => 
    (a.status === 'submitted' || a.status === 'graded') && !a.autoSubmittedDueToViolations
  );

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const renderAttemptCard = (attempt: Attempt, showViolations = false) => (
    <div
      key={attempt.id}
      className={`p-4 border rounded-lg ${
        attempt.autoSubmittedDueToViolations
          ? 'border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/20'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-gray-900 dark:text-white">
              {attempt.studentName}
            </h4>
            {attempt.autoSubmittedDueToViolations && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                Auto-Submitted
              </Badge>
            )}
            {attempt.status === 'graded' && (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="w-3 h-3 mr-1" />
                Graded
              </Badge>
            )}
            {attempt.status === 'in_progress' && (
              <Badge variant="secondary">
                <Clock className="w-3 h-3 mr-1" />
                In Progress
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {attempt.registrationNumber}
          </p>
        </div>
        
        <div className="text-right">
          {attempt.score !== null && (
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {attempt.score}/{attempt.totalMarks}
            </div>
          )}
          {attempt.percentage !== null && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {attempt.percentage.toFixed(1)}%
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
        <div>
          <span className="text-gray-600 dark:text-gray-400">Attempt:</span>
          <span className="ml-2 font-medium text-gray-900 dark:text-white">
            #{attempt.attemptNumber}
          </span>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Started:</span>
          <span className="ml-2 font-medium text-gray-900 dark:text-white">
            {formatTime(attempt.startedAt)}
          </span>
        </div>
        {attempt.submittedAt && (
          <div className="col-span-2">
            <span className="text-gray-600 dark:text-gray-400">Submitted:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">
              {formatTime(attempt.submittedAt)}
            </span>
          </div>
        )}
      </div>

      {showViolations && attempt.totalViolations > 0 && (
        <div className="mb-3 p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-sm text-red-800 dark:text-red-200">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">{attempt.totalViolations} Violation(s) Detected</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/teacher/grading/${attempt.id}`)}
          className="gap-2"
        >
          <Eye className="w-4 h-4" />
          {attempt.status === 'graded' ? 'Review' : 'Grade'}
        </Button>
        
        <AttemptReset
          studentId={attempt.studentId}
          studentName={attempt.studentName}
          quizId={quizId}
          quizTitle={quizTitle}
          currentAttempts={attempt.attemptNumber}
          maxAttempts={maxAttempts}
          onResetComplete={onRefresh}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="gap-2">
            All
            <Badge variant="secondary">{attempts.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2">
            Manual
            <Badge variant="secondary">{manualSubmitted.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="auto" className="gap-2">
            Auto-Submitted
            <Badge variant="destructive">{autoSubmitted.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="progress" className="gap-2">
            In Progress
            <Badge variant="secondary">{inProgress.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-4">
          {attempts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No submissions yet
            </div>
          ) : (
            <div className="grid gap-4">
              {attempts.map(attempt => renderAttemptCard(attempt, true))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="manual" className="space-y-4 mt-4">
          {manualSubmitted.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No manual submissions
            </div>
          ) : (
            <div className="grid gap-4">
              {manualSubmitted.map(attempt => renderAttemptCard(attempt))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="auto" className="space-y-4 mt-4">
          <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-1">
                  Auto-Submitted Attempts
                </h4>
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  These submissions were automatically submitted due to 3 or more violations.
                  You can review them and decide whether to grant additional attempts.
                </p>
              </div>
            </div>
          </div>

          {autoSubmitted.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No auto-submitted attempts
            </div>
          ) : (
            <div className="grid gap-4">
              {autoSubmitted.map(attempt => renderAttemptCard(attempt, true))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="progress" className="space-y-4 mt-4">
          {inProgress.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No students currently taking the quiz
            </div>
          ) : (
            <div className="grid gap-4">
              {inProgress.map(attempt => renderAttemptCard(attempt, true))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
