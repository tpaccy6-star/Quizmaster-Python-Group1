import { useState } from 'react';
import {
    Clock, Users, Shield, Monitor, Award, Lock, Eye, Shuffle,
    ChevronDown, ChevronUp, HelpCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface QuizSettingsProps {
    settings: any;
    onChange: (settings: any) => void;
}

interface SettingsSectionProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

function SettingsSection({ title, icon, children, defaultOpen = false }: SettingsSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
                <div className="flex items-center gap-3">
                    {icon}
                    <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {isOpen && (
                <div className="p-4 space-y-4 bg-white dark:bg-gray-900">
                    {children}
                </div>
            )}
        </div>
    );
}

export default function QuizSettings({ settings, onChange }: QuizSettingsProps) {
    const updateSetting = (key: string, value: any) => {
        onChange({ ...settings, [key]: value });
    };

    const updateIPAddresses = (value: string) => {
        // Parse comma-separated IPs or JSON array
        let ips = [];
        try {
            if (value.trim().startsWith('[')) {
                ips = JSON.parse(value);
            } else {
                ips = value.split(',').map(ip => ip.trim()).filter(ip => ip);
            }
        } catch {
            ips = value.split(',').map(ip => ip.trim()).filter(ip => ip);
        }
        updateSetting('allowed_ip_addresses', JSON.stringify(ips));
    };

    const getIPAddressesDisplay = () => {
        if (!settings.allowed_ip_addresses) return '';
        try {
            const ips = JSON.parse(settings.allowed_ip_addresses);
            return Array.isArray(ips) ? ips.join(', ') : settings.allowed_ip_addresses;
        } catch {
            return settings.allowed_ip_addresses;
        }
    };

    return (
        <div className="space-y-4">
            {/* Time Settings */}
            <SettingsSection title="Time Settings" icon={<Clock className="w-4 h-4" />} defaultOpen={true}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="startDate">Start Date/Time</Label>
                        <Input
                            id="startDate"
                            type="datetime-local"
                            value={settings.start_date || ''}
                            onChange={(e) => updateSetting('start_date', e.target.value)}
                        />
                    </div>
                    <div>
                        <Label htmlFor="endDate">End Date/Time</Label>
                        <Input
                            id="endDate"
                            type="datetime-local"
                            value={settings.end_date || ''}
                            onChange={(e) => updateSetting('end_date', e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Label htmlFor="allowLateSubmissions">Allow Late Submissions</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Students can submit after the end time
                        </p>
                    </div>
                    <Switch
                        id="allowLateSubmissions"
                        checked={settings.allow_late_submissions || false}
                        onCheckedChange={(checked: boolean) => updateSetting('allow_late_submissions', checked)}
                    />
                </div>
            </SettingsSection>

            {/* Attempt Settings */}
            <SettingsSection title="Attempt Settings" icon={<Users className="w-4 h-4" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="maxAttempts">Maximum Attempts</Label>
                        <Input
                            id="maxAttempts"
                            type="number"
                            min="1"
                            max="10"
                            value={settings.max_attempts || 1}
                            onChange={(e) => updateSetting('max_attempts', parseInt(e.target.value))}
                        />
                    </div>
                    <div>
                        <Label htmlFor="retakePolicy">Retake Policy</Label>
                        <Select value={settings.retake_policy || 'highest'} onValueChange={(value: string) => updateSetting('retake_policy', value)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="highest">Highest Score</SelectItem>
                                <SelectItem value="latest">Latest Attempt</SelectItem>
                                <SelectItem value="average">Average of All Attempts</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Label htmlFor="showCorrectAnswers">Show Correct Answers After Submission</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Display correct answers when students review their quiz
                        </p>
                    </div>
                    <Switch
                        id="showCorrectAnswers"
                        checked={settings.show_correct_answers || false}
                        onCheckedChange={(checked: boolean) => updateSetting('show_correct_answers', checked)}
                    />
                </div>
            </SettingsSection>

            {/* Security Settings */}
            <SettingsSection title="Security Settings" icon={<Shield className="w-4 h-4" />}>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label htmlFor="preventTabSwitching">Prevent Tab Switching</Label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Warn students when they switch tabs during the quiz
                            </p>
                        </div>
                        <Switch
                            id="preventTabSwitching"
                            checked={settings.prevent_tab_switching || false}
                            onCheckedChange={(checked: boolean) => updateSetting('prevent_tab_switching', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label htmlFor="requireFullscreen">Require Fullscreen Mode</Label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Force quiz to run in fullscreen mode
                            </p>
                        </div>
                        <Switch
                            id="requireFullscreen"
                            checked={settings.require_fullscreen || false}
                            onCheckedChange={(checked: boolean) => updateSetting('require_fullscreen', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label htmlFor="enableCameraMonitoring">Enable Camera Monitoring</Label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Monitor students via webcam during quiz (experimental)
                            </p>
                        </div>
                        <Switch
                            id="enableCameraMonitoring"
                            checked={settings.enable_camera_monitoring || false}
                            onCheckedChange={(checked: boolean) => updateSetting('enable_camera_monitoring', checked)}
                        />
                    </div>
                </div>
            </SettingsSection>

            {/* Display Settings */}
            <SettingsSection title="Display Settings" icon={<Monitor className="w-4 h-4" />}>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label htmlFor="showQuestionsOneAtATime">Show Questions One at a Time</Label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Display one question per page instead of all questions
                            </p>
                        </div>
                        <Switch
                            id="showQuestionsOneAtATime"
                            checked={settings.show_questions_one_at_a_time || false}
                            onCheckedChange={(checked: boolean) => updateSetting('show_questions_one_at_a_time', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label htmlFor="showProgressBar">Show Progress Bar</Label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Display student's progress through the quiz
                            </p>
                        </div>
                        <Switch
                            id="showProgressBar"
                            checked={settings.show_progress_bar !== false} // default true
                            onCheckedChange={(checked: boolean) => updateSetting('show_progress_bar', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label htmlFor="randomizeQuestions">Randomize Question Order</Label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Shuffle questions for each student
                            </p>
                        </div>
                        <Switch
                            id="randomizeQuestions"
                            checked={settings.randomize_questions || false}
                            onCheckedChange={(checked: boolean) => updateSetting('randomize_questions', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label htmlFor="randomizeOptions">Randomize Answer Options</Label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Shuffle answer choices for multiple choice questions
                            </p>
                        </div>
                        <Switch
                            id="randomizeOptions"
                            checked={settings.randomize_options || false}
                            onCheckedChange={(checked: boolean) => updateSetting('randomize_options', checked)}
                        />
                    </div>
                </div>
            </SettingsSection>

            {/* Grading Settings */}
            <SettingsSection title="Grading Settings" icon={<Award className="w-4 h-4" />}>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="passingPercentage">Passing Percentage (%)</Label>
                            <Input
                                id="passingPercentage"
                                type="number"
                                min="0"
                                max="100"
                                value={settings.passing_percentage || 40}
                                onChange={(e) => updateSetting('passing_percentage', parseInt(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label htmlFor="enableAutoGrading">Enable Auto-Grading</Label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Automatically grade multiple choice and true/false questions
                            </p>
                        </div>
                        <Switch
                            id="enableAutoGrading"
                            checked={settings.enable_auto_grading !== false} // default true
                            onCheckedChange={(checked: boolean) => updateSetting('enable_auto_grading', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label htmlFor="allowPartialCredit">Allow Partial Credit</Label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Give partial points for partially correct answers
                            </p>
                        </div>
                        <Switch
                            id="allowPartialCredit"
                            checked={settings.allow_partial_credit !== false} // default true
                            onCheckedChange={(checked: boolean) => updateSetting('allow_partial_credit', checked)}
                        />
                    </div>
                </div>
            </SettingsSection>

            {/* Access Settings */}
            <SettingsSection title="Access Settings" icon={<Lock className="w-4 h-4" />}>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label htmlFor="requireAccessCode">Require Access Code</Label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Students need an access code to start the quiz
                            </p>
                        </div>
                        <Switch
                            id="requireAccessCode"
                            checked={settings.require_access_code !== false} // default true
                            onCheckedChange={(checked: boolean) => updateSetting('require_access_code', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label htmlFor="passwordProtection">Password Protection</Label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Require password to access quiz
                            </p>
                        </div>
                        <Switch
                            id="passwordProtection"
                            checked={settings.password_protection || false}
                            onCheckedChange={(checked: boolean) => updateSetting('password_protection', checked)}
                        />
                    </div>

                    {settings.password_protection && (
                        <div>
                            <Label htmlFor="quizPassword">Quiz Password</Label>
                            <Input
                                id="quizPassword"
                                type="password"
                                value={settings.quiz_password || ''}
                                onChange={(e) => updateSetting('quiz_password', e.target.value)}
                                placeholder="Enter quiz password"
                            />
                        </div>
                    )}

                    <div>
                        <Label htmlFor="allowedIPAddresses">Allowed IP Addresses</Label>
                        <Textarea
                            id="allowedIPAddresses"
                            value={getIPAddressesDisplay()}
                            onChange={(e) => updateIPAddresses(e.target.value)}
                            placeholder="Enter IP addresses separated by commas (e.g., 192.168.1.1, 10.0.0.1)"
                            rows={3}
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Leave empty to allow all IP addresses
                        </p>
                    </div>
                </div>
            </SettingsSection>
        </div>
    );
}
