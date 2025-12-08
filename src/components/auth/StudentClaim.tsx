import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, User as UserIcon, Lock, Eye, EyeOff, ArrowLeft, Info } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Alert, AlertDescription } from '../ui/alert';
import { claimStudentAccount } from '../../lib/mockData';
import { toast } from 'sonner';

export default function StudentClaim() {
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      const result = claimStudentAccount(registrationNumber.toUpperCase(), password);

      if ('error' in result) {
        setError(result.error || 'An error occurred');
        setIsLoading(false);
        return;
      }

      // Success
      toast.success('Account claimed successfully! Please login with your new credentials.');
      navigate('/login');
      setIsLoading(false);
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
            <h2 className="text-2xl font-bold mb-1">Claim Your Account</h2>
            <p className="text-muted-foreground">Student Registration</p>
          </div>

          <Alert className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-sm text-blue-800 dark:text-blue-300">
              Enter your registration number to claim your pre-existing account and set your password.
            </AlertDescription>
          </Alert>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="regNumber">Registration Number</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="regNumber"
                  type="text"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  className="pl-10"
                  placeholder="e.g., STU2024001"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Create Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-12"
                  placeholder="Min 6 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-12"
                  placeholder="Re-enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#0b486b] to-[#3b8d99] hover:opacity-90 text-white shadow-lg hover:shadow-xl transition-all rounded-full mt-6"
            >
              {isLoading ? 'Claiming Account...' : 'Claim Account'}
            </Button>

            <div className="text-center pt-4">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="text-[#3b8d99] hover:underline font-semibold"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </form>

          {/* Demo Info */}
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-2">Demo Registration Numbers:</p>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>STU2024001 - Alice Johnson</div>
              <div>STU2024002 - Bob Smith</div>
              <div>STU2024003 - Charlie Brown</div>
            </div>
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