import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../shared/DashboardLayout';
import {
  Plus, Users, Edit, Trash2, UserPlus, Upload, Download, Printer,
  X, Search, Filter
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from 'sonner';
import { apiService } from '../../lib/api';

interface AdminClassesProps {
  user: any;
  onLogout: () => void;
}

export default function AdminClasses({ user, onLogout }: AdminClassesProps) {
  const { currentUser: authUser, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAssignTeacherDialog, setShowAssignTeacherDialog] = useState(false);
  const [showAssignStudentDialog, setShowAssignStudentDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalClasses, setTotalClasses] = useState(0);
  const itemsPerPage = 12;

  // Form states
  const [className, setClassName] = useState('');
  const [classSection, setClassSection] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching classes data...');

        // Fetch classes
        const classesResponse = await apiService.getClasses();
        console.log('Classes response:', classesResponse);

        // Fetch users for teachers/students
        const usersResponse = await apiService.getUsers(1, 100);
        console.log('Users response:', usersResponse);

        // Process the API responses
        const classesData = (classesResponse as any).classes && Array.isArray((classesResponse as any).classes) ? (classesResponse as any).classes : [];
        const usersData = (usersResponse as any).users && Array.isArray((usersResponse as any).users) ? (usersResponse as any).users : [];

        console.log('Processed classes data:', classesData);
        console.log('Processed users data:', usersData);

        setClasses(classesData);
        setTeachers(usersData.filter((u: any) => u.role === 'teacher' || u.role === 'TEACHER'));
        setStudents(usersData.filter((u: any) => u.role === 'student' || u.role === 'STUDENT'));

      } catch (error) {
        console.error('Failed to load classes data:', error);
        toast.error('Failed to load data');
        setClasses([]);
        setTeachers([]);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching classes data...');

        // Fetch classes
        const classesResponse = await apiService.getClasses(currentPage, itemsPerPage);
        console.log('Classes response:', classesResponse);

        // Fetch users for teachers/students
        const usersResponse = await apiService.getUsers(1, 100);
        console.log('Users response:', usersResponse);

        // Process the API responses
        const classesData = (classesResponse as any).classes && Array.isArray((classesResponse as any).classes) ? (classesResponse as any).classes : [];
        const usersData = (usersResponse as any).users && Array.isArray((usersResponse as any).users) ? (usersResponse as any).users : [];

        console.log('Processed classes data:', classesData);
        console.log('Processed users data:', usersData);

        setClasses(classesData);
        setTeachers(usersData.filter((u: any) => u.role === 'teacher' || u.role === 'TEACHER'));
        setStudents(usersData.filter((u: any) => u.role === 'student' || u.role === 'STUDENT'));
        setTotalPages((classesResponse as any).pages || 1);
        setTotalClasses((classesResponse as any).total || 0);

      } catch (error) {
        console.error('Failed to load classes data:', error);
        toast.error('Failed to load data');
        setClasses([]);
        setTeachers([]);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentPage]);

  const filteredClasses = classes.filter(cls =>
    cls.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper functions to get class information
  const getStudentCount = (classId: string) => {
    return students.filter(student => student.class_id === classId).length;
  };

  const getAssignedTeachers = (classItem: any) => {
    // Check if the class has teachers array from the backend
    if (classItem.teachers && Array.isArray(classItem.teachers)) {
      return classItem.teachers;
    }
    // Fallback to empty array if no teachers
    return [];
  };

  const getAssignedTeacherNames = (classItem: any) => {
    const assignedTeachers = getAssignedTeachers(classItem);
    return assignedTeachers.map((teacher: any) => teacher.name).join(', ') || 'No teacher assigned';
  };

  const refreshData = async () => {
    try {
      setLoading(true);

      // Fetch classes
      const classesResponse = await apiService.getClasses(currentPage, itemsPerPage);

      // Fetch users for teachers/students
      const usersResponse = await apiService.getUsers(1, 100);

      // Process the API responses
      const classesData = (classesResponse as any).classes && Array.isArray((classesResponse as any).classes) ? (classesResponse as any).classes : [];
      const usersData = (usersResponse as any).users && Array.isArray((usersResponse as any).users) ? (usersResponse as any).users : [];

      setClasses(classesData);
      setTeachers(usersData.filter((u: any) => u.role === 'teacher' || u.role === 'TEACHER'));
      setStudents(usersData.filter((u: any) => u.role === 'student' || u.role === 'STUDENT'));
      setTotalPages((classesResponse as any).pages || 1);
      setTotalClasses((classesResponse as any).total || 0);

    } catch (error) {
      console.error('Failed to refresh data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async () => {
    if (!className.trim()) {
      toast.error('Class name is required');
      return;
    }

    const fullClassName = classSection.trim()
      ? `${className} ${classSection}`
      : className;

    try {
      await apiService.createClass({
        name: fullClassName,
        section: classSection.trim() || null
      });
      toast.success('Class created successfully');
      setClassName('');
      setClassSection('');
      setShowCreateDialog(false);
      await refreshData();
    } catch (error) {
      console.error('Create class error:', error);
      toast.error('Failed to create class');
    }
  };

  const handleEditClass = async () => {
    if (!className.trim()) {
      toast.error('Class name is required');
      return;
    }

    try {
      await apiService.updateClass(selectedClass.id, {
        name: className
      });
      toast.success(`Class renamed to "${className}"`);
      setShowEditDialog(false);
      await refreshData();
    } catch (error) {
      console.error('Update class error:', error);
      toast.error('Failed to update class');
    }
  };

  const handleDeleteClass = async () => {
    try {
      await apiService.deleteClass(selectedClass.id);
      toast.success(`Class "${selectedClass.name}" deleted`);
      setShowDeleteDialog(false);
      setSelectedClass(null);
      await refreshData();
    } catch (error) {
      console.error('Delete class error:', error);
      toast.error('Failed to delete class');
    }
  };

  const handleAssignTeacher = async () => {
    if (!selectedTeacher) {
      toast.error('Please select a teacher');
      return;
    }

    try {
      await apiService.assignTeacherToClass(selectedClass.id, selectedTeacher);
      const teacher = teachers.find(t => t.id === selectedTeacher);
      toast.success(`${teacher?.name} assigned to ${selectedClass.name}`);
      setShowAssignTeacherDialog(false);
      setSelectedTeacher('');
      await refreshData();
    } catch (error) {
      console.error('Assign teacher error:', error);
      toast.error('Failed to assign teacher');
    }
  };

  const handleAssignStudent = async () => {
    if (!selectedStudent) {
      toast.error('Please select a student');
      return;
    }

    try {
      await apiService.assignStudentToClass(selectedClass.id, selectedStudent);
      const student = students.find(s => s.id === selectedStudent);
      toast.success(`${student?.name} assigned to ${selectedClass.name}`);
      setShowAssignStudentDialog(false);
      setSelectedStudent('');
      await refreshData();
    } catch (error) {
      console.error('Assign student error:', error);
      toast.error('Failed to assign student');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const preview = lines.slice(1, 6).filter(line => line.trim()).map((line, idx) => {
        const [name, email, regno, className] = line.split(',').map(s => s.trim());
        return { id: idx, name, email, registrationNumber: regno, className };
      });
      setImportPreview(preview);
    };
    reader.readAsText(file);
  };

  const handleBulkImport = () => {
    if (!csvFile) {
      toast.error('Please select a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const studentsData = lines.slice(1).filter(line => line.trim()).map(line => {
        const [name, email, registrationNumber, className] = line.split(',').map(s => s.trim());
        return { name, email, registrationNumber, className };
      });

      // Real API call to bulk import students
      try {
        const createPromises = studentsData.map(student =>
          apiService.createUser({
            name: student.name,
            email: student.email,
            registration_number: student.registrationNumber,
            class_id: selectedClass?.id || null,
            role: 'student'
          })
        );

        await Promise.all(createPromises);
        toast.success(`Successfully imported ${studentsData.length} students`);
        setShowImportDialog(false);
        setCsvFile(null);
        setImportPreview([]);
        await refreshData();
      } catch (error) {
        console.error('Bulk import error:', error);
        toast.error('Failed to import students');
      }
    };
    reader.readAsText(csvFile);
  };

  const handleExportClasses = () => {
    const csvContent = [
      ['Class Name', 'Student Count', 'Assigned Teachers'],
      ...filteredClasses.map(cls => [
        cls.name,
        getStudentCount(cls.id).toString(),
        getAssignedTeacherNames(cls)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'classes_export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Classes exported successfully');
  };

  const handlePrint = (classData: any) => {
    const classStudents = students.filter(s => s.classId === classData.id);
    const printContent = `
      <html>
        <head>
          <title>Class Report - ${classData.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #0b486b; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #3b8d99; color: white; }
            .header { margin-bottom: 20px; }
            .info { margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>QuizMaster Academic</h1>
            <h2>Class Report: ${classData.name}</h2>
          </div>
          <div class="info">
            <p><strong>Teacher:</strong> ${classData.teacherName || 'Not assigned'}</p>
            <p><strong>Total Students:</strong> ${classStudents.length}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Registration Number</th>
                <th>Name</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              ${classStudents.map((s, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${s.registrationNumber}</td>
                  <td>${s.name}</td>
                  <td>${s.email}</td>
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

  const downloadCSVTemplate = () => {
    const template = 'Name,Email,Registration Number,Class Name\nJohn Doe,john@example.com,STU2024100,Class 10A\nJane Smith,jane@example.com,STU2024101,Class 10A';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  if (loading) {
    return (
      <DashboardLayout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl">Class Management</h1>
            <p className="text-muted-foreground">Manage classes, assign teachers and students</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExportClasses}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Classes
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Students
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Class
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((cls) => (
            <Card key={cls.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{cls.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {getAssignedTeacherNames(cls)}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePrint(cls)}
                    >
                      <Printer className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedClass(cls);
                        setClassName(cls.name);
                        setShowEditDialog(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedClass(cls);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{getStudentCount(cls.id)} students</span>
                </div>
                {getAssignedTeachers(cls).length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UserPlus className="w-4 h-4" />
                    <span>Teachers: {getAssignedTeacherNames(cls)}</span>
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedClass(cls);
                      setShowAssignTeacherDialog(true);
                    }}
                  >
                    <UserPlus className="w-3 h-3 mr-1" />
                    Assign Teacher
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedClass(cls);
                      setShowAssignStudentDialog(true);
                    }}
                  >
                    <UserPlus className="w-3 h-3 mr-1" />
                    Assign Student
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredClasses.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No classes found</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalClasses)} of {totalClasses} classes
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Class Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Class</DialogTitle>
            <DialogDescription>
              Add a new class to the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="className">Class Name</Label>
              <Input
                id="className"
                placeholder="e.g., Class 10"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="classSection">Section</Label>
              <Input
                id="classSection"
                placeholder="e.g., A, B, C"
                value={classSection}
                onChange={(e) => setClassSection(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setClassName('');
              setClassSection('');
              setShowCreateDialog(false);
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateClass}>Create Class</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Class Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
            <DialogDescription>
              Update class information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editClassName">Class Name</Label>
              <Input
                id="editClassName"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditClass}>Update Class</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Class Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedClass?.name}&quot;? Students will be unassigned from this class.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClass} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Teacher Dialog */}
      <Dialog open={showAssignTeacherDialog} onOpenChange={setShowAssignTeacherDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Teacher</DialogTitle>
            <DialogDescription>
              Assign a teacher to {selectedClass?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Teacher</Label>
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map(teacher => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name} - {teacher.subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignTeacherDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignTeacher}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Student Dialog */}
      <Dialog open={showAssignStudentDialog} onOpenChange={setShowAssignStudentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Student</DialogTitle>
            <DialogDescription>
              Assign a student to {selectedClass?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} ({student.registrationNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignStudentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignStudent}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Students Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Students</DialogTitle>
            <DialogDescription>
              Upload a CSV file to bulk import students
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>CSV File</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
              />
              <p className="text-xs text-muted-foreground mt-1">
                CSV format: Name, Email, Registration Number, Class Name
              </p>
            </div>
            <Button
              variant="link"
              onClick={downloadCSVTemplate}
              className="px-0"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>

            {importPreview.length > 0 && (
              <div>
                <Label>Preview (first 5 rows)</Label>
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Email</th>
                        <th className="p-2 text-left">Reg No</th>
                        <th className="p-2 text-left">Class</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((row) => (
                        <tr key={row.id} className="border-t">
                          <td className="p-2">{row.name}</td>
                          <td className="p-2">{row.email}</td>
                          <td className="p-2">{row.registrationNumber}</td>
                          <td className="p-2">{row.className}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkImport} disabled={!csvFile}>
              Import Students
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}