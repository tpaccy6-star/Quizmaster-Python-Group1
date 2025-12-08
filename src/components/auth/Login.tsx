import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, Lock, Eye, EyeOff, ArrowLeft, KeyRound } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ email, password });
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
      setIsLoading(false);
    }
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

      {/* Back to Home */}
      <Link
        to="/"
        className="absolute top-8 left-8 text-white/80 hover:text-white flex items-center gap-2 transition-colors z-20"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Home</span>
      </Link>

      {/* Demo Credentials Button */}
      <div className="absolute top-8 right-8 z-20">
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              className="bg-white text-[#0b486b] hover:bg-white/90 shadow-lg"
            >
              <KeyRound className="w-4 h-4 mr-2" />
              Demo Access
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[#0b486b]">
                <KeyRound className="w-5 h-5" />
                Demo Credentials
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Admin */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                    Admin
                  </span>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">System Access</span>
                </div>
                <div className="flex gap-3 bg-muted p-3 rounded-lg">
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-1">Email</div>
                    <div className="font-semibold">admin@quiz.com</div>
                  </div>
                  <div className="flex-1 border-l pl-3">
                    <div className="text-xs text-muted-foreground mb-1">Password</div>
                    <div className="font-semibold font-mono">admin123</div>
                  </div>
                </div>
              </div>

              {/* Teacher */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                    Teacher
                  </span>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Manage Quizzes</span>
                </div>
                <div className="flex gap-3 bg-muted p-3 rounded-lg">
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-1">Email</div>
                    <div className="font-semibold">teacher@quiz.com</div>
                  </div>
                  <div className="flex-1 border-l pl-3">
                    <div className="text-xs text-muted-foreground mb-1">Password</div>
                    <div className="font-semibold font-mono">teacher123</div>
                  </div>
                </div>
              </div>

              {/* Student */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                    Student
                  </span>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Take Assessments</span>
                </div>
                <div className="flex gap-3 bg-muted p-3 rounded-lg">
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-1">Email / Reg. No</div>
                    <div className="font-semibold">alice@student.com</div>
                    <div className="text-xs text-muted-foreground mt-1">or STU2024001</div>
                  </div>
                  <div className="flex-1 border-l pl-3">
                    <div className="text-xs text-muted-foreground mb-1">Password</div>
                    <div className="font-semibold font-mono">student123</div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-card rounded-3xl shadow-2xl p-10 border border-white/10">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4 shadow-md">
              <GraduationCap className="w-8 h-8 text-[#0b486b]" />
            </div>
            <h2 className="text-2xl font-bold mb-1">Welcome Back</h2>
            <p className="text-muted-foreground">Login to QuizMaster Academic</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email or Reg Number</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  placeholder="paccy@example.com or 222400177"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-12"
                  placeholder="Enter your password"
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

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <label
                  htmlFor="remember"
                  className="text-sm text-muted-foreground cursor-pointer select-none"
                >
                  Remember me
                </label>
              </div>
              <Link
                to="/forgot-password"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#0b486b] to-[#3b8d99] hover:opacity-90 text-white shadow-lg hover:shadow-xl transition-all rounded-full"
            >
              {isLoading ? 'Signing in...' : 'Login'}
            </Button>

            <div className="text-center pt-4">
              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link
                  to="/claim-account"
                  className="text-[#3b8d99] hover:underline font-semibold"
                >
                  Claim Account
                </Link>
              </p>
            </div>
          </form>
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
    </div >
  );
}