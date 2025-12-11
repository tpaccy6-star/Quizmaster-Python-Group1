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

interface BulkResetModalProps {
    isOpen: boolean;
    onClose: () => void;
    quizId: string;
    quizTitle: string;
    totalStudents: number;
    onComplete: () => void;
}

export default function BulkResetModal({
    isOpen,
    onClose,
    quizId,
    quizTitle,
    totalStudents,
    onComplete
}: BulkResetModalProps) {
    const [additionalAttempts, setAdditionalAttempts] = useState(1);
    const [reason, setReason] = useState('');
    const [isResetting, setIsResetting] = useState(false);

    const handleReset = async () => {
        if (!reason.trim()) {
            toast.error('Please provide a reason for the bulk reset');
            return;
        }

        setIsResetting(true);
        try {
            await apiService.resetQuizAttempts(quizId, additionalAttempts, reason);
            toast.success(`Bulk reset successful! All ${totalStudents} students now have ${additionalAttempts} additional attempt(s).`);
            onClose();
            setReason('');
            setAdditionalAttempts(1);
            onComplete();
        } catch (error: any) {
            console.error('Bulk reset failed:', error);
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
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                        Reset All Attempts
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Grant extra attempts to all students in "{quizTitle}"
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Info */}
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-xs space-y-1">
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Students:</span>
                            <span className="font-medium">{totalStudents}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Additional attempts:</span>
                            <span className="font-medium">{additionalAttempts}</span>
                        </div>
                    </div>

                    {/* Attempts input */}
                    <div className="space-y-1">
                        <Label htmlFor="attempts" className="text-xs font-medium">Additional attempts per student</Label>
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
                            placeholder="e.g., Technical issues, schedule changes..."
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
                        className="bg-orange-600 hover:bg-orange-700 text-xs h-7"
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
                                Reset All
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
