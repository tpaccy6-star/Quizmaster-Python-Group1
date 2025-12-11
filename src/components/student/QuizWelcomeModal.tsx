import { useState } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { AlertTriangle, Clock, Trophy, FileQuestion, Info } from 'lucide-react';
import { toast } from 'sonner';

interface QuizWelcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
    quiz: any;
    onStartQuiz: () => void;
}

export default function QuizWelcomeModal({ isOpen, onClose, quiz, onStartQuiz }: QuizWelcomeModalProps) {
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    const handleStartClick = () => {
        setShowConfirmDialog(true);
    };

    const handleConfirmStart = () => {
        try {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            }
            onStartQuiz();
            setShowConfirmDialog(false);
            onClose();
        } catch (error) {
            console.error('Fullscreen failed:', error);
            // Still proceed with quiz even if fullscreen fails
            onStartQuiz();
            setShowConfirmDialog(false);
            onClose();
        }
    };

    const handleCancelStart = () => {
        setShowConfirmDialog(false);
    };

    if (!quiz) return null;

    return (
        <>
            <Dialog open={isOpen && !showConfirmDialog} onOpenChange={onClose}>
                <DialogContent className="max-w-md p-4 max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <FileQuestion className="w-5 h-5 text-blue-600" />
                            Welcome to {quiz.title}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3 mt-3">
                        {/* Quiz Instructions */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1 flex items-center gap-2 text-sm">
                                <Info className="w-3 h-3" />
                                Quiz Instructions
                            </h3>
                            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-0.5 list-disc list-inside">
                                <li>Read each question carefully before answering</li>
                                <li>Once you submit an answer, you cannot change it</li>
                                <li>The quiz will auto-submit when time expires</li>
                                <li>Make sure you have a stable internet connection</li>
                                <li>Do not refresh the page during the quiz</li>
                            </ul>
                        </div>

                        {/* Quiz Information - Single Column */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                                <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-0.5">
                                    <Trophy className="w-3 h-3" />
                                    Total Marks
                                </div>
                                <div className="text-lg font-bold text-gray-900 dark:text-white">
                                    {quiz.total_marks || 0}
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                                <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-0.5">
                                    <FileQuestion className="w-3 h-3" />
                                    Questions
                                </div>
                                <div className="text-lg font-bold text-gray-900 dark:text-white">
                                    {quiz.total_questions || 0}
                                </div>
                            </div>

                            {quiz.time_limit_minutes && (
                                <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                                    <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-0.5">
                                        <Clock className="w-3 h-3" />
                                        Time Limit
                                    </div>
                                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                                        {quiz.time_limit_minutes} min
                                    </div>
                                </div>
                            )}

                            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                                <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-0.5">
                                    <Trophy className="w-3 h-3" />
                                    Passing Score
                                </div>
                                <div className="text-lg font-bold text-gray-900 dark:text-white">
                                    {quiz.passing_percentage || 0}%
                                </div>
                            </div>
                        </div>

                        {/* Additional Info */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-600 dark:text-gray-400">Subject:</span>
                                <span className="font-medium text-gray-900 dark:text-white text-xs">{quiz.subject || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-600 dark:text-gray-400">Max Attempts:</span>
                                <span className="font-medium text-gray-900 dark:text-white text-xs">{quiz.max_attempts || 1}</span>
                            </div>
                            {quiz.description && (
                                <div className="text-xs">
                                    <span className="text-gray-600 dark:text-gray-400">Description:</span>
                                    <p className="mt-0.5 text-gray-900 dark:text-white">{quiz.description}</p>
                                </div>
                            )}
                        </div>

                        {/* Warning */}
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <div className="flex items-start gap-1">
                                <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-yellow-800 dark:text-yellow-200">
                                    <p className="font-medium mb-0.5">Important Notice:</p>
                                    <p>This quiz will start in fullscreen mode. Once started, you cannot go back. Make sure you're ready before proceeding.</p>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={onClose} size="sm">
                                Cancel
                            </Button>
                            <Button onClick={handleStartClick} className="bg-blue-600 hover:bg-blue-700" size="sm">
                                Continue
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Confirmation Dialog */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent className="max-w-md p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                            Start Quiz in Fullscreen
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 mt-4">
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                            <p className="text-sm text-orange-800 dark:text-orange-200">
                                You are about to start the quiz in fullscreen mode. This action cannot be reverted. Please confirm:
                            </p>
                            <ul className="mt-2 text-sm text-orange-800 dark:text-orange-200 list-disc list-inside">
                                <li>You are ready to take the quiz now</li>
                                <li>You have a stable internet connection</li>
                                <li>You will not be able to navigate away during the quiz</li>
                            </ul>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={handleCancelStart} className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600">
                                Cancel
                            </Button>
                            <Button onClick={handleConfirmStart} className="bg-green-600 hover:bg-green-700 text-white font-medium">
                                Confirm & Start Quiz
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
