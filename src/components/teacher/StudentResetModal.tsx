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
import { apiService } from '../../lib/api';

interface StudentResetModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentId: string;
    studentName: string;
    quizId: string;
    quizTitle: string;
    maxAttempts: number;
    onComplete: () => void;
}

export default function StudentResetModal({
    isOpen,
    onClose,
    studentId,
    studentName,
    quizId,
    quizTitle,
    maxAttempts,
    onComplete
}: StudentResetModalProps) {
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
            await apiService.resetStudentAttempts(studentId, quizId, additionalAttempts, reason);
            toast.success(`Reset successful! ${studentName} now has ${additionalAttempts} additional attempt(s).`);
            onClose();
            setReason('');
            setAdditionalAttempts(1);
            onComplete();
        } catch (error: any) {
            console.error('Reset failed:', error);
            toast.error(error.message || 'Failed to reset attempts. Please try again.');
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[380px] p-4">
                <DialogHeader className="pb-3">
                    <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
                        <RotateCcw className="w-4 h-4 text-blue-600" />
                        Reset Attempts
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Grant extra attempts to {studentName} for "{quizTitle}"
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Info */}
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-xs space-y-1">
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Student:</span>
                            <span className="font-medium">{studentName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Current max:</span>
                            <span className="font-medium">{maxAttempts}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Additional:</span>
                            <span className="font-medium">{additionalAttempts}</span>
                        </div>
                    </div>

                    {/* Attempts input */}
                    <div className="space-y-1">
                        <Label htmlFor="attempts" className="text-xs font-medium">Additional attempts</Label>
                        <Input
                            id="attempts"
                            type="number"
                            min={1}
                            max={10}
                            value={additionalAttempts}
                            onChange={(e) => setAdditionalAttempts(parseInt(e.target.value) || 1)}
                            className="h-8 text-xs"
                        />
                    </div>

                    {/* Reason */}
                    <div className="space-y-1">
                        <Label htmlFor="reason" className="text-xs font-medium">
                            Reason <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g., Technical issues, medical emergency..."
                            rows={2}
                            className="text-xs resize-none"
                        />
                    </div>
                </div>

                <DialogFooter className="pt-3 gap-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isResetting}
                        size="sm"
                        className="text-xs h-7"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleReset}
                        disabled={isResetting || !reason.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-xs h-7"
                        size="sm"
                    >
                        {isResetting ? (
                            <>
                                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                Resetting...
                            </>
                        ) : (
                            <>
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Reset
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
