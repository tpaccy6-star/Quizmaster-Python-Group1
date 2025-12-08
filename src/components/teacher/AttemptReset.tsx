import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { AlertCircle, RotateCcw, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface AttemptResetProps {
  studentId: string;
  studentName: string;
  quizId: string;
  quizTitle: string;
  currentAttempts: number;
  maxAttempts: number;
  onResetComplete: () => void;
}

export default function AttemptReset({
  studentId,
  studentName,
  quizId,
  quizTitle,
  currentAttempts,
  maxAttempts,
  onResetComplete
}: AttemptResetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [additionalAttempts, setAdditionalAttempts] = useState(1);
  const [reason, setReason] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for the reset');
      return;
    }

    setIsResetting(true);

    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/attempts/reset`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     student_id: studentId,
      //     quiz_id: quizId,
      //     additional_attempts: additionalAttempts,
      //     reason: reason
      //   })
      // });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success(`Reset successful! ${studentName} can now attempt the quiz ${additionalAttempts} more time(s)`);

      // Trigger notification to student
      // This will be handled by the backend

      setIsOpen(false);
      setReason('');
      setAdditionalAttempts(1);
      onResetComplete();
    } catch (error) {
      console.error('Reset failed:', error);
      toast.error('Failed to reset attempts. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        disabled={currentAttempts === 0}
        className="gap-2"
      >
        <RotateCcw className="w-4 h-4" />
        Reset Attempts
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-blue-600" />
              Reset Quiz Attempts
            </DialogTitle>
            <DialogDescription>
              Grant additional attempts to this student for the selected quiz.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Student Info */}
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Student:</span>
                <span className="font-medium text-gray-900 dark:text-white">{studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Quiz:</span>
                <span className="font-medium text-gray-900 dark:text-white">{quizTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Current Attempts:</span>
                <span className="font-medium text-gray-900 dark:text-white">{currentAttempts} / {maxAttempts}</span>
              </div>
            </div>

            {/* Warning */}
            <div className="flex gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
              <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-800 dark:text-orange-200">
                <p className="font-medium mb-1">Important Notes:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Previous attempts will be preserved for review</li>
                  <li>Auto-submitted attempts will remain visible</li>
                  <li>The student will be notified of this reset</li>
                  <li>This action will be logged in the audit trail</li>
                </ul>
              </div>
            </div>

            {/* Additional Attempts */}
            <div className="space-y-2">
              <Label htmlFor="attempts">Additional Attempts</Label>
              <Input
                id="attempts"
                type="number"
                min={1}
                max={10}
                value={additionalAttempts}
                onChange={(e) => setAdditionalAttempts(parseInt(e.target.value) || 1)}
                placeholder="Enter number of additional attempts"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                New limit will be: {maxAttempts + additionalAttempts} attempts
              </p>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">
                Reason for Reset <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Technical issues during quiz, medical emergency, etc."
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This reason will be visible to administrators and in the audit log.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReset}
              disabled={isResetting || !reason.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isResetting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Confirm Reset
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
