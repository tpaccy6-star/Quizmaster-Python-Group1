import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from './shared/ThemeProvider';
import { 
  GraduationCap, Moon, Sun, Menu, X, 
  LayoutDashboard, Users, FileText, TrendingUp,
  Gauge, CheckSquare, Database, ClipboardList,
  BarChart3, Shield, Fullscreen, Eye, Ban,
  ShieldCheck
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

type TabType = 'teacher' | 'student' | 'admin';

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('teacher');

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#0b486b] to-[#3b8d99] shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Brand */}
            <Link to="/" className="flex items-center gap-2 text-white">
              <GraduationCap className="h-8 w-8" />
              <span className="font-bold text-xl">QuizMaster</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#overview" className="text-white/90 hover:text-white transition-colors">
                Platform
              </a>
              <a href="#roles" className="text-white/90 hover:text-white transition-colors">
                Solutions
              </a>
              <a href="#security" className="text-white/90 hover:text-white transition-colors">
                Security
              </a>
              <Link to="/login" className="text-white/90 hover:text-white transition-colors">
                Login
              </Link>
              <Link to="/login">
                <Button 
                  variant="secondary" 
                  className="bg-white text-[#0b486b] hover:bg-white/90"
                >
                  Get Started
                </Button>
              </Link>
            </div>

            {/* Theme Toggle & Mobile Menu */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-all hover:rotate-12 hover:scale-110"
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-white"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-2">
              <a href="#overview" className="block text-white/90 hover:text-white py-2">
                Platform
              </a>
              <a href="#roles" className="block text-white/90 hover:text-white py-2">
                Solutions
              </a>
              <a href="#security" className="block text-white/90 hover:text-white py-2">
                Security
              </a>
              <Link to="/login" className="block text-white/90 hover:text-white py-2">
                Login
              </Link>
              <Link to="/login">
                <Button variant="secondary" className="w-full mt-2 bg-white text-[#0b486b]">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <header 
        id="overview"
        className="relative pt-32 pb-24 px-4 overflow-hidden bg-gradient-to-r from-[#0b486b] to-[#3b8d99] rounded-b-[3rem]"
      >
        <div className="container mx-auto text-center relative z-10">
          <div className="max-w-4xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 border border-white/25 text-white mb-6">
              <span>✨ Trusted by Leading Academic Institutions</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Secure, Scalable & Smart Assessments.
            </h1>
            
            <p className="text-lg md:text-xl text-white/90 mb-8 max-w-3xl mx-auto">
              A comprehensive quiz management system designed for academic integrity. Empower teachers with data-driven insights and provide students with a secure, distraction-free environment.
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center">
              <a href="#roles">
                <Button 
                  size="lg" 
                  className="bg-white text-[#0b486b] hover:bg-white/90 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
                >
                  Explore Features
                </Button>
              </a>
              <a href="#security">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-2 border-white/80 text-white hover:bg-white hover:text-[#0b486b] transition-all"
                >
                  Request Demo
                </Button>
              </a>
            </div>
          </div>

          {/* Dashboard Mockup */}
          <div className="max-w-6xl mx-auto">
            <div className="bg-card rounded-xl shadow-2xl overflow-hidden border border-border">
              {/* Browser Header */}
              <div className="bg-muted px-4 py-3 border-b border-border flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              
              {/* Dashboard Content */}
              <div className="grid md:grid-cols-[250px_1fr] bg-background">
                {/* Sidebar */}
                <div className="hidden md:block border-r border-border p-4 space-y-3">
                  <div className="flex items-center gap-2 text-[#3b8d99]">
                    <LayoutDashboard className="h-5 w-5" />
                    <span>Dashboard</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-5 w-5" />
                    <span>Students</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-5 w-5" />
                    <span>Quizzes</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="h-5 w-5" />
                    <span>Analytics</span>
                  </div>
                </div>
                
                {/* Main Content */}
                <div className="p-6">
                  <h4 className="font-bold mb-4">Class Performance Overview</h4>
                  
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <Card className="p-4">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Avg. Score
                      </div>
                      <div className="text-2xl font-bold text-green-600">84%</div>
                    </Card>
                    <Card className="p-4">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Active Quizzes
                      </div>
                      <div className="text-2xl font-bold text-[#3b8d99]">12</div>
                    </Card>
                    <Card className="p-4">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Students
                      </div>
                      <div className="text-2xl font-bold">156</div>
                    </Card>
                  </div>
                  
                  {/* Mock Chart */}
                  <Card className="p-4 h-48 flex items-end justify-around gap-2">
                    <div className="w-full h-[40%] bg-muted rounded-t"></div>
                    <div className="w-full h-[60%] bg-muted rounded-t"></div>
                    <div className="w-full h-[85%] bg-[#3b8d99] rounded-t"></div>
                    <div className="w-full h-[70%] bg-muted rounded-t"></div>
                    <div className="w-full h-[50%] bg-muted rounded-t"></div>
                    <div className="w-full h-[90%] bg-[#3b8d99] rounded-t"></div>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Role-Based Solutions */}
      <section id="roles" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Tailored for Every Role</h2>
            <p className="text-muted-foreground text-lg">
              A dedicated experience for Admins, Teachers, and Students.
            </p>
          </div>

          {/* Role Tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <Button
              onClick={() => setActiveTab('teacher')}
              variant={activeTab === 'teacher' ? 'default' : 'outline'}
              className={activeTab === 'teacher' 
                ? 'bg-gradient-to-r from-[#0b486b] to-[#3b8d99] text-white shadow-lg' 
                : ''
              }
            >
              👨‍🏫 Teachers
            </Button>
            <Button
              onClick={() => setActiveTab('student')}
              variant={activeTab === 'student' ? 'default' : 'outline'}
              className={activeTab === 'student' 
                ? 'bg-gradient-to-r from-[#0b486b] to-[#3b8d99] text-white shadow-lg' 
                : ''
              }
            >
              🎓 Students
            </Button>
            <Button
              onClick={() => setActiveTab('admin')}
              variant={activeTab === 'admin' ? 'default' : 'outline'}
              className={activeTab === 'admin' 
                ? 'bg-gradient-to-r from-[#0b486b] to-[#3b8d99] text-white shadow-lg' 
                : ''
              }
            >
              ⚙️ Administrators
            </Button>
          </div>

          {/* Tab Content */}
          <div className="max-w-6xl mx-auto">
            {/* Teacher Tab */}
            {activeTab === 'teacher' && (
              <div className="grid md:grid-cols-3 gap-6">
                <FeatureCard
                  icon={<Gauge className="h-8 w-8" />}
                  iconBg="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                  title="Real-Time Monitoring"
                  description="Watch students progress live. Identify who has started, finished, or triggered cheat alerts instantly."
                />
                <FeatureCard
                  icon={<CheckSquare className="h-8 w-8" />}
                  iconBg="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                  title="Automated Grading"
                  description="MCQs are graded instantly. For descriptive answers, use our streamlined manual review interface."
                />
                <FeatureCard
                  icon={<Database className="h-8 w-8" />}
                  iconBg="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
                  title="Question Bank"
                  description="Create a centralized repository of questions. Reuse them across different quizzes to save time."
                />
              </div>
            )}

            {/* Student Tab */}
            {activeTab === 'student' && (
              <div className="grid md:grid-cols-3 gap-6">
                <FeatureCard
                  icon={<ClipboardList className="h-8 w-8" />}
                  iconBg="bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400"
                  title="Intuitive Interface"
                  description="A distraction-free quiz environment with a clear question palette and countdown timer."
                />
                <FeatureCard
                  icon={<TrendingUp className="h-8 w-8" />}
                  iconBg="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                  title="Performance Tracking"
                  description="View detailed feedback, track progress over time, and compare scores across different subjects."
                />
                <FeatureCard
                  icon={<Shield className="h-8 w-8" />}
                  iconBg="bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400"
                  title="Secure Access"
                  description="Simple claim-account process using registration numbers prevents unauthorized access."
                />
              </div>
            )}

            {/* Admin Tab */}
            {activeTab === 'admin' && (
              <div className="grid md:grid-cols-3 gap-6">
                <FeatureCard
                  icon={<Users className="h-8 w-8" />}
                  iconBg="bg-slate-100 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400"
                  title="User Management"
                  description="Centralized control to add, update, or remove teachers and students. Bulk upload supported."
                />
                <FeatureCard
                  icon={<LayoutDashboard className="h-8 w-8" />}
                  iconBg="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                  title="Class Organization"
                  description="Create classes and assign teachers and students effortlessly to ensure structured learning."
                />
                <FeatureCard
                  icon={<BarChart3 className="h-8 w-8" />}
                  iconBg="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                  title="System Oversight"
                  description="View platform-wide statistics, monitor quiz creation trends, and generate system reports."
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm mb-4">
                <ShieldCheck className="h-4 w-4" />
                Enterprise Grade Security
              </div>
              
              <h2 className="text-3xl md:text-5xl font-bold mb-6">
                Uncompromising Integrity.
              </h2>
              
              <p className="text-lg text-muted-foreground mb-8">
                We ensure assessments are fair and valid with advanced anti-cheating mechanisms built directly into the browser.
              </p>
              
              <div className="space-y-6">
                <SecurityFeature
                  icon={<Fullscreen className="h-6 w-6" />}
                  title="Fullscreen Enforcement"
                  description="Quizzes must be taken in fullscreen. Exiting triggers an immediate warning."
                />
                <SecurityFeature
                  icon={<Eye className="h-6 w-6" />}
                  title="Focus Monitoring"
                  description="We detect if a student switches tabs or minimizes the browser. Automatic submission on repeat violations."
                />
                <SecurityFeature
                  icon={<Ban className="h-6 w-6" />}
                  title="Input Blocking"
                  description="Right-click, copy, and paste functionalities are disabled during the quiz."
                />
              </div>
            </div>
            
            <div>
              <Card className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 text-white p-8 text-center border-0 shadow-2xl">
                <ShieldCheck className="h-24 w-24 mx-auto mb-4 text-green-500 opacity-75" />
                <h4 className="text-xl font-bold mb-2">Secure Environment Active</h4>
                <p className="text-white/75 mb-6">Monitoring active sessions...</p>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full animate-pulse w-full"></div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-16 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <h5 className="text-white font-bold mb-4">QuizMaster</h5>
              <p className="text-sm opacity-75">
                The trusted academic assessment platform for modern educational institutions.
              </p>
            </div>
            
            <div>
              <h6 className="text-white font-bold mb-4">Platform</h6>
              <ul className="space-y-2 text-sm">
                <li><a href="#roles" className="hover:text-white transition-colors">Teachers</a></li>
                <li><a href="#roles" className="hover:text-white transition-colors">Students</a></li>
                <li><a href="#roles" className="hover:text-white transition-colors">Admins</a></li>
              </ul>
            </div>
            
            <div>
              <h6 className="text-white font-bold mb-4">Support</h6>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">System Status</a></li>
              </ul>
            </div>
            
            <div>
              <h6 className="text-white font-bold mb-4">Legal</h6>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <hr className="border-slate-700 mb-8" />
          
          <div className="text-center text-sm opacity-50">
            &copy; 2025 QuizMaster Academic. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

// Helper Components
interface FeatureCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
}

function FeatureCard({ icon, iconBg, title, description }: FeatureCardProps) {
  return (
    <Card className="p-6 hover:-translate-y-2 hover:shadow-xl transition-all duration-300 border hover:border-[#3b8d99]">
      <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h4 className="font-bold mb-2">{title}</h4>
      <p className="text-muted-foreground text-sm">{description}</p>
    </Card>
  );
}

interface SecurityFeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function SecurityFeature({ icon, title, description }: SecurityFeatureProps) {
  return (
    <div className="flex items-start gap-4">
      <div className="text-[#3b8d99] mt-1">
        {icon}
      </div>
      <div>
        <h5 className="font-bold mb-1">{title}</h5>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
