import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, ArrowLeft, CheckCircle, Lock } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { generatePasswordResetToken, resetPassword } from '../../lib/mockData';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const [step, setStep] = useState<'email' | 'code' | 'password' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const navigate = useNavigate();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      const result = generatePasswordResetToken(email);
      
      if ('error' in result) {
        setError(result.error);
        setIsLoading(false);
        return;
      }
      
      // In a real app, the token would be sent via email
      // Here we'll display it for demo purposes
      setGeneratedToken(result.token || '');
      setStep('code');
      toast.success('Reset code generated! (Check below for demo)');
      setIsLoading(false);
    }, 1000);
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (resetCode !== generatedToken) {
      setError('Invalid reset code. Please try again.');
      return;
    }
    
    setStep('password');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    
    setTimeout(() => {
      const result = resetPassword(email, generatedToken, newPassword);
      
      if ('error' in result) {
        setError(result.error);
        setIsLoading(false);
        return;
      }
      
      setStep('success');
      toast.success('Password reset successfully!');
      setIsLoading(false);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    }, 800);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0b486b] to-[#3b8d99] flex items-center justify-center p-4">
      {/* Floating Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-20 h-20 bg-white/10 rounded-full top-[10%] left-[10%] animate-float"></div>
        <div className="absolute w-32 h-32 bg-white/10 rounded-full top-[20%] left-[80%] animate-float-delayed-2"></div>
        <div className="absolute w-16 h-16 bg-white/10 rounded-full top-[60%] left-[5%] animate-float-delayed-4"></div>
        <div className="absolute w-24 h-24 bg-white/10 rounded-full top-[70%] left-[70%] animate-float-delayed-6"></div>
      </div>

      {/* Back to Login */}
      <Link 
        to="/login"
        className="absolute top-8 left-8 text-white/80 hover:text-white flex items-center gap-2 transition-colors z-20"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Login</span>
      </Link>

      {/* Auth Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-card rounded-3xl shadow-2xl p-10 border border-white/10">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4 shadow-md">
              <GraduationCap className="w-8 h-8 text-[#0b486b]" />
            </div>
            <h2 className="text-2xl font-bold mb-1">Reset Password</h2>
            <p className="text-muted-foreground">QuizMaster Academic</p>
          </div>

          {step === 'email' && (
            <>
              <p className="text-sm text-muted-foreground mb-6 text-center">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-[#0b486b] to-[#3b8d99] hover:opacity-90 text-white shadow-lg hover:shadow-xl transition-all rounded-full mt-6"
                >
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
            </>
          )}

          {step === 'code' && (
            <>
              <p className="text-sm text-muted-foreground mb-6 text-center">
                Enter the reset code sent to your email.
              </p>

              {generatedToken && (
                <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-xs text-yellow-800 dark:text-yellow-300 mb-1">Demo Mode - Your Reset Code:</p>
                  <p className="text-2xl font-mono font-bold text-yellow-900 dark:text-yellow-100 text-center tracking-wider">{generatedToken}</p>
                </div>
              )}

              <form onSubmit={handleCodeSubmit} className="space-y-4">
                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="code">Reset Code</Label>
                  <Input
                    id="code"
                    type="text"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#0b486b] to-[#3b8d99] hover:opacity-90 text-white shadow-lg hover:shadow-xl transition-all rounded-full mt-6"
                >
                  Verify Code
                </Button>
              </form>
            </>
          )}

          {step === 'password' && (
            <>
              <p className="text-sm text-muted-foreground mb-6 text-center">
                Enter your new password.
              </p>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10"
                      placeholder="Min 6 characters"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      placeholder="Confirm new password"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-[#0b486b] to-[#3b8d99] hover:opacity-90 text-white shadow-lg hover:shadow-xl transition-all rounded-full mt-6"
                >
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </form>
            </>
          )}

          {step === 'success' && (
            <div className="text-center space-y-4 py-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Password Reset Successful</h3>
                <p className="text-sm text-muted-foreground">
                  Your password has been successfully reset. Redirecting to login...
                </p>
              </div>
            </div>
          )}

          {/* Back to Login */}
          <div className="mt-6 pt-6 border-t border-border text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-[#3b8d99] hover:underline font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0% { transform: translateY(0) rotate(0deg); }
          100% { transform: translateY(-1000px) rotate(720deg); }
        }
        .animate-float {
          animation: float 15s infinite linear;
        }
        .animate-float-delayed-2 {
          animation: float 15s infinite linear 2s;
        }
        .animate-float-delayed-4 {
          animation: float 15s infinite linear 4s;
        }
        .animate-float-delayed-6 {
          animation: float 15s infinite linear 6s;
        }
      `}</style>
    </div>
  );
}