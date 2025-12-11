import { useState } from 'react';
import DashboardLayout from '../shared/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { Upload, Users, Search, Printer } from 'lucide-react';
import { apiService } from '../../lib/api';
import { useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

export default function StudentManagement() {
  const { currentUser: user, logout } = useAuth();

  if (!user) {
    return <div>Loading...</div>;
  }

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentsRes, classesRes] = await Promise.all([
          apiService.getTeacherStudents(),
          apiService.getTeacherClasses(),
        ]);
        setStudents(Array.isArray((studentsRes as any).students) ? (studentsRes as any).students : []);
        setClasses(Array.isArray((classesRes as any).classes) ? (classesRes as any).classes : []);
      } catch (error) {
        console.error('Failed to fetch data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Apply search and class filter
  const filteredStudents = students.filter((s: any) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.registration_number.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClass = selectedClass === 'all' || s.class_id === selectedClass;

    return matchesSearch && matchesClass;
  });

  const handlePrint = () => {
    const printContent = `
      <html>
        <head>
          <title>Students Report - ${user.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #0b486b; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #3b8d99; color: white; }
            .header { margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>QuizMaster Academic</h1>
            <h2>Student Report - ${user.name}</h2>
            <p>Generated: ${new Date().toLocaleDateString()}</p>
            <p>Total Students: ${filteredStudents.length}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Name</th>
                <th>Registration Number</th>
                <th>Email</th>
                <th>Class</th>
              </tr>
            </thead>
            <tbody>
              ${filteredStudents.map((s, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${s.name}</td>
                  <td>${s.registration_number}</td>
                  <td>${s.email}</td>
                  <td>${classes.find(c => c.id === s.class_id)?.name || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <DashboardLayout user={user} onLogout={logout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl">My Students</h1>
            <p className="text-muted-foreground">Students from your assigned classes</p>
          </div>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>

        {/* Classes Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg p-4 border">
            <div className="text-muted-foreground text-sm">Your Classes</div>
            <div className="text-2xl mt-1">{classes.length}</div>
          </div>
          <div className="bg-card rounded-lg p-4 border">
            <div className="text-muted-foreground text-sm">Total Students</div>
            <div className="text-2xl mt-1">{students.length}</div>
          </div>
          <div className="bg-card rounded-lg p-4 border">
            <div className="text-muted-foreground text-sm">Filtered Results</div>
            <div className="text-2xl mt-1">{filteredStudents.length}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((cls: any) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Students Table */}
        <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs uppercase">Reg. Number</th>
                <th className="px-6 py-3 text-left text-xs uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs uppercase">Class</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td className="px-6 py-4 text-sm">{student.name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{student.registration_number}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{student.email}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{classes.find(c => c.id === student.class_id)?.name || 'N/A'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    {students.length === 0
                      ? 'No students assigned to your classes yet'
                      : 'No students match your search criteria'
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
