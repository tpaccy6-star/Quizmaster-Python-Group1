import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AntiCheatSystem from './AntiCheatSystem';
import QuizTaking from './QuizTaking';

export default function QuizTakingWithAntiCheat() {
    const navigate = useNavigate();
    const [violations, setViolations] = useState(0);

    const handleViolation = useCallback((type: string, count: number) => {
        console.log(`Violation ${type} detected. Total: ${count}`);
        setViolations(count);

        // Show appropriate warnings based on violation count
        if (count >= 5) {
            toast.error('Quiz terminated due to excessive violations!');
        } else if (count >= 3) {
            toast.warning('Multiple violations detected! Quiz may be terminated.');
        }
    }, []);

    const handleFullscreenExit = useCallback(() => {
        toast.error('Fullscreen exited! Submitting quiz...');
        setTimeout(() => {
            navigate('/student/quizzes');
        }, 2000);
    }, [navigate]);

    return (
        <AntiCheatSystem
            attemptId={window.location.pathname.split('/').pop() || ''}
            onViolation={handleViolation}
            onFullscreenExit={handleFullscreenExit}
        >
            <QuizTaking />
        </AntiCheatSystem>
    );
}
