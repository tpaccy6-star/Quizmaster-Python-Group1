import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Eye, EyeOff, Shield } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../ui/alert-dialog';
import { apiService } from '../../lib/api';

interface AntiCheatSystemProps {
    attemptId: string;
    onViolation: (type: string, count: number) => void;
    onFullscreenExit: () => void;
    children: React.ReactNode;
    quiz?: any; // Quiz data with settings
}

interface DeviceInfo {
    userAgent: string;
    platform: string;
    language: string;
    screenResolution: string;
    colorDepth: number;
    timezone: string;
    ip?: string;
    timestamp: string;
}

interface ViolationLog {
    violation_type: string;  // Changed from 'type' to 'violation_type'
    timestamp: string;
    details?: any;
}

export default function AntiCheatSystem({
    attemptId,
    onViolation,
    onFullscreenExit,
    children,
    quiz
}: AntiCheatSystemProps) {
    const [violations, setViolations] = useState(0);
    const [showAccessCodeDialog, setShowAccessCodeDialog] = useState(false);
    const [accessCode, setAccessCode] = useState('');
    const [questionsBlurred, setQuestionsBlurred] = useState(false); // Start clear, blur only on escape
    const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
    const [violationLogs, setViolationLogs] = useState<ViolationLog[]>([]);
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [fullscreenEscapeAttempts, setFullscreenEscapeAttempts] = useState(0);
    const [showViolationPage, setShowViolationPage] = useState(false);
    const [openTabs, setOpenTabs] = useState<string[]>([]);

    const violationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const monitoringCleanupRef = useRef<(() => void) | null>(null);

    // Collect device information
    const collectDeviceInfo = useCallback((): DeviceInfo => {
        const info: DeviceInfo = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenResolution: `${screen.width}x${screen.height}`,
            colorDepth: screen.colorDepth,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timestamp: new Date().toISOString(),
        };
        // Don't set state here - it will be set in useEffect
        return info;
    }, []);

    // Log violation
    const logViolation = useCallback((type: string, details?: any) => {
        const violation: ViolationLog = {
            violation_type: type,  // Changed from 'type' to 'violation_type'
            timestamp: new Date().toISOString(),
            details,
        };

        setViolationLogs(prev => [...prev, violation]);
        setViolations(prev => {
            const newCount = prev + 1;
            onViolation(type, newCount);
            return newCount;
        });

        // Send violation to backend
        apiService.logViolation(attemptId, violation).catch(err => {
            console.error('Failed to log violation:', err);
        });
    }, [attemptId, onViolation]);

    // Verify access code
    const verifyAccessCode = useCallback(async () => {
        if (!accessCode.trim()) {
            toast.error('Please enter an access code');
            return;
        }

        try {
            const deviceInfo = collectDeviceInfo();
            await apiService.verifyQuizAccessCode(attemptId, accessCode, deviceInfo);
            setShowAccessCodeDialog(false);
            setAccessCode('');
            setQuestionsBlurred(false);
            toast.success('Access verified! You can now take the quiz.');
        } catch (error) {
            toast.error('Invalid access code. Please contact your teacher.');
            logViolation('INVALID_ACCESS_CODE', { attemptedCode: accessCode });
        }
    }, [attemptId, accessCode, collectDeviceInfo, logViolation]);

    // Setup monitoring
    const setupMonitoring = useCallback(() => {
        if (isMonitoring) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                logViolation('TAB_SWITCH');
                toast.warning('Tab switching detected! This has been recorded.');
            }
        };

        const handleBlur = () => {
            logViolation('WINDOW_FOCUS_LOST');
            toast.warning('Window focus lost! This has been recorded.');
        };

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            logViolation('RIGHT_CLICK');
            toast.error('Right-click disabled! Violation recorded.');
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            // Block common shortcuts
            if (e.ctrlKey || e.metaKey) {
                if (['c', 'v', 'x', 'r', 'f', 'a'].includes(e.key)) {
                    e.preventDefault();
                    logViolation('KEYBOARD_SHORTCUT', { key: e.key });
                    toast.error('Keyboard shortcuts disabled! Violation recorded.');
                }
            }

            // Block developer tools
            if (e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && ['I', 'J'].includes(e.key)) ||
                (e.ctrlKey && e.key === 'U')) {
                e.preventDefault();
                logViolation('DEVELOPER_TOOLS');
                toast.error('Developer tools disabled! Violation recorded.');
            }
        };

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                // User tried to escape fullscreen
                const newAttemptCount = fullscreenEscapeAttempts + 1;
                setFullscreenEscapeAttempts(newAttemptCount);

                if (newAttemptCount >= 3) {
                    // 3rd attempt - show violation page
                    setShowViolationPage(true);
                    logViolation('FULLSCREEN_EXIT_FINAL', { attempts: newAttemptCount });
                    toast.error('Quiz terminated due to multiple fullscreen exit attempts!');
                    onFullscreenExit();
                } else {
                    // First or second attempt - ask for access code and blur questions
                    setShowAccessCodeDialog(true);
                    setQuestionsBlurred(true);
                    logViolation('FULLSCREEN_EXIT_ATTEMPT', {
                        attempt: newAttemptCount,
                        message: `User attempted to exit fullscreen (attempt ${newAttemptCount}/3)`
                    });
                    toast.warning(`Fullscreen exit detected! Please enter access code to continue (${newAttemptCount}/3 attempts)`);

                    // Try to force fullscreen back
                    setTimeout(() => {
                        if (document.documentElement.requestFullscreen) {
                            document.documentElement.requestFullscreen().catch(() => {
                                // If failed, show access code dialog
                            });
                        }
                    }, 100);
                }
            }
        };

        // Add event listeners conditionally based on quiz settings
        if (quiz?.prevent_tab_switching) {
            document.addEventListener('visibilitychange', handleVisibilityChange);
            window.addEventListener('blur', handleBlur);
        }

        if (quiz?.prevent_tab_switching) {
            document.addEventListener('contextmenu', handleContextMenu);
            document.addEventListener('keydown', handleKeyDown);
        }

        if (quiz?.require_fullscreen) {
            document.addEventListener('fullscreenchange', handleFullscreenChange);
        }

        setIsMonitoring(true);

        // Return cleanup function
        return () => {
            if (quiz?.prevent_tab_switching) {
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                window.removeEventListener('blur', handleBlur);
                document.removeEventListener('contextmenu', handleContextMenu);
                document.removeEventListener('keydown', handleKeyDown);
            }

            if (quiz?.require_fullscreen) {
                document.removeEventListener('fullscreenchange', handleFullscreenChange);
            }

            setIsMonitoring(false);
        };
    }, [logViolation, onFullscreenExit, quiz]);

    // Initialize monitoring
    useEffect(() => {
        const cleanup = setupMonitoring();
        monitoringCleanupRef.current = cleanup || (() => { });

        return () => {
            if (monitoringCleanupRef.current) {
                monitoringCleanupRef.current();
            }
        };
    }, [setupMonitoring]);

    // Monitor open tabs when quiz starts
    useEffect(() => {
        if (!isMonitoring) return;

        // Record initial open tabs (simplified approach)
        const recordOpenTabs = () => {
            try {
                // In a real implementation, this would use more sophisticated methods
                // For now, we'll record when user switches tabs
                const handleTabSwitch = () => {
                    logViolation('TAB_DETECTED', {
                        timestamp: new Date().toISOString(),
                        action: 'tab_switch_detected'
                    });
                };

                document.addEventListener('visibilitychange', handleTabSwitch);
                return () => document.removeEventListener('visibilitychange', handleTabSwitch);
            } catch (error) {
                console.warn('Tab monitoring not fully supported in this browser');
            }
        };

        const cleanup = recordOpenTabs();
        return cleanup;
    }, [isMonitoring, logViolation]);

    // Don't show access code on mount - only when user tries to escape
    useEffect(() => {
        const info = collectDeviceInfo();
        setDeviceInfo(info);
    }, [collectDeviceInfo]);

    // Auto-submit quiz on too many violations
    useEffect(() => {
        if (violations >= 5) {
            toast.error('Too many violations! Quiz will be submitted automatically.');
            onFullscreenExit();
        }
    }, [violations, onFullscreenExit]);

    // Get violation message
    const getViolationMessage = (count: number) => {
        if (count === 0) return 'No violations detected';
        if (count <= 2) return 'Minor violations detected';
        if (count <= 4) return 'Multiple violations detected';
        return 'Critical violations detected';
    };

    const getViolationColor = (count: number) => {
        if (count === 0) return 'text-green-500';
        if (count <= 2) return 'text-yellow-500';
        if (count <= 4) return 'text-orange-500';
        return 'text-red-500';
    };

    return (
        <>
            {/* Violation Page - shown after 3 escape attempts */}
            {showViolationPage && (
                <div className="fixed inset-0 z-50 bg-gray-900 flex items-center justify-center">
                    <div className="bg-gray-800 rounded-lg p-8 max-w-2xl mx-4 text-center">
                        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-red-400 mb-4">
                            Quiz Terminated Due to Violations
                        </h1>
                        <p className="text-gray-300 mb-6">
                            You attempted to exit fullscreen mode 3 times. This violates the quiz security policy.
                            Your teacher has been notified of this incident.
                        </p>
                        <div className="bg-gray-700 rounded p-4 mb-6 text-left">
                            <h3 className="text-white font-semibold mb-2">Incident Details:</h3>
                            <p className="text-gray-300 text-sm">
                                • 3 attempts to exit fullscreen detected<br />
                                • Time: {new Date().toLocaleString()}<br />
                                • Device: {deviceInfo?.userAgent?.split(' ')[0] || 'Unknown'}<br />
                                • IP Address: {deviceInfo?.ip || 'Being recorded...'}
                            </p>
                        </div>
                        <p className="text-gray-300 mb-6">
                            To continue with this quiz, you must contact your teacher personally to receive a new access code.
                        </p>
                        <button
                            onClick={() => window.location.href = '/student/quizzes'}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg mr-4"
                        >
                            Return to Dashboard
                        </button>
                        <button
                            onClick={() => setShowAccessCodeDialog(true)}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg"
                        >
                            Request Access Code
                        </button>
                    </div>
                </div>
            )}

            {/* Anti-cheating overlay with blur effect */}
            <div className={`relative transition-all duration-300 ${questionsBlurred ? 'filter blur-sm' : ''}`}>
                {children}
            </div>

            {/* Access Code Dialog */}
            <AlertDialog open={showAccessCodeDialog} onOpenChange={setShowAccessCodeDialog}>
                <AlertDialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-xl">
                            <Shield className="w-6 h-6 text-blue-500" />
                            Security Verification Required
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-300">
                            {showViolationPage
                                ? "Your quiz was terminated due to security violations. Contact your teacher personally for a new access code to continue."
                                : "You attempted to exit fullscreen mode. Please enter the access code from your teacher to continue with the quiz."
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="my-4">
                        <input
                            type="password"
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value)}
                            className="w-full rounded-lg border border-gray-600 bg-gray-700 p-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                            placeholder="Enter access code from teacher"
                            autoFocus
                            onKeyPress={(e) => e.key === 'Enter' && verifyAccessCode()}
                        />
                        <p className="text-gray-400 text-sm mt-2">
                            {showViolationPage
                                ? "This code must be obtained directly from your teacher."
                                : `Attempts remaining: ${3 - fullscreenEscapeAttempts - 1}/3`
                            }
                        </p>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => showViolationPage ? window.location.href = '/student/quizzes' : setShowAccessCodeDialog(false)}
                            className="bg-gray-600 hover:bg-gray-700 text-white"
                        >
                            {showViolationPage ? 'Exit Quiz' : 'Cancel'}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={verifyAccessCode}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Verify Code
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Critical Warning Dialog */}
            {violations >= 3 && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-900 border border-red-700 rounded-lg p-4 shadow-xl max-w-md">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-400" />
                        <div>
                            <h3 className="text-red-300 font-semibold">Warning!</h3>
                            <p className="text-red-200 text-sm">
                                Multiple violations detected. Continued violations will result in automatic quiz submission.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
