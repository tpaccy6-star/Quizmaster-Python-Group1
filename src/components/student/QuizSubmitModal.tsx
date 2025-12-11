import { useState } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { AlertTriangle, CheckCircle, Clock, FileQuestion } from 'lucide-react';
import { toast } from 'sonner';

interface QuizSubmitModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: () => void;
    quiz: any;
    answersCount: number;
    totalQuestions: number;
    timeRemaining: number | null;
    violations: number;
}

export default function QuizSubmitModal({
    isOpen,
    onClose,
    onSubmit,
    quiz,
    answersCount,
    totalQuestions,
    timeRemaining,
    violations
}: QuizSubmitModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const unansweredCount = totalQuestions - answersCount;
    const hasTimeLeft = timeRemaining !== null && timeRemaining > 0;

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await onSubmit();
        } catch (error) {
            setIsSubmitting(false);
        }
    };

    const formatTime = (seconds: number | null) => {
        if (seconds === null) return 'No limit';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        Submit Quiz
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {/* Quiz Summary */}
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Quiz Summary</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Questions Answered:</span>
                                <span className={`font-medium ${answersCount === totalQuestions ? 'text-green-600' : 'text-orange-600'}`}>
                                    {answersCount}/{totalQuestions}
                                </span>
                            </div>
                            {unansweredCount > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Unanswered:</span>
                                    <span className="font-medium text-orange-600">{unansweredCount}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Time Remaining:</span>
                                <span className={`font-medium ${hasTimeLeft ? 'text-blue-600' : 'text-red-600'}`}>
                                    {hasTimeLeft ? formatTime(timeRemaining) : 'Expired'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Violations:</span>
                                <span className={`font-medium ${violations >= 3 ? 'text-red-600' : 'text-yellow-600'}`}>
                                    {violations}/3
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Warnings */}
                    {unansweredCount > 0 && (
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-orange-800 dark:text-orange-200">
                                    <p className="font-medium">You have {unansweredCount} unanswered question{unansweredCount > 1 ? 's' : ''}.</p>
                                    <p>Unanswered questions will be marked as incorrect.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {violations >= 3 && (
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-red-800 dark:text-red-200">
                                    <p className="font-medium">Maximum violations reached!</p>
                                    <p>Your quiz may be flagged for review.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Confirmation Message */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <div className="flex items-start gap-2">
                            <FileQuestion className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-800 dark:text-blue-200">
                                <p className="font-medium">Are you ready to submit?</p>
                                <p>Once submitted, you cannot change your answers.</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isSubmitting ? 'Submitting...' : 'Continue & Submit'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
