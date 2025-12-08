import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Search, Edit, Trash2, Printer } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
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
import { toast } from 'sonner';
import DashboardLayout from '../shared/DashboardLayout';
import { apiService } from '../../lib/api';

export default function AdminUsers() {
  const { currentUser: user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const itemsPerPage = 20;
  const [activeTab, setActiveTab] = useState<'teachers' | 'students'>('teachers');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [classId, setClassId] = useState('');

  if (!user) {
    return <div>Loading...</div>;
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch users and classes
        const usersResponse = await apiService.getUsers(1, 50);
        const classesResponse = await apiService.getClasses();

        // Process the API responses
        const usersData = (usersResponse as any).users && Array.isArray((usersResponse as any).users) ? (usersResponse as any).users : [];
        const classesData = (classesResponse as any).classes && Array.isArray((classesResponse as any).classes) ? (classesResponse as any).classes : [];

        setTeachers(usersData.filter((u: any) => u.role === 'teacher' || u.role === 'TEACHER'));
        setStudents(usersData.filter((u: any) => u.role === 'student' || u.role === 'STUDENT'));
        setClasses(classesData);

      } catch (error) {
        console.error('Failed to load users data:', error);
        toast.error('Failed to load data');
        setStudents([]);
        setClasses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (currentPage > 1) {
      refreshData();
    }
  }, [currentPage]);

  const filteredTeachers = teachers.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.registration_number && s.registration_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    console.log('Still loading, showing spinner');
    return (
      <DashboardLayout user={user} onLogout={logout}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const handleCreateUser = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    if (activeTab === 'teachers') {
      if (!subject.trim()) {
        toast.error('Subject is required');
        return;
      }

      try {
        const newUserData = {
          name,
          email,
          role: 'teacher',
          subject
        };

        await apiService.createUser(newUserData);
        toast.success('Teacher created successfully');
        resetForm();
        setShowCreateDialog(false);
        // Refresh data
        window.location.reload();
      } catch (error) {
        console.error('Create teacher error:', error);
        toast.error('Failed to create teacher');
      }
    } else {
      if (!registrationNumber.trim() || !classId) {
        toast.error('Registration number and class are required');
        return;
      }

      try {
        const newUserData = {
          name,
          email,
          role: 'student',
          registration_number: registrationNumber,
          class_id: classId
        };

        await apiService.createUser(newUserData);
        toast.success(`Student "${name}" created successfully`);
        resetForm();
        setShowCreateDialog(false);
        // Refresh data
        window.location.reload();
      } catch (error) {
        console.error('Create student error:', error);
        toast.error('Failed to create student');
      }
    }

    resetForm();
    setShowCreateDialog(false);
  };

  const handleEditUser = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    if (activeTab === 'teachers') {
      if (!subject.trim()) {
        toast.error('Subject is required');
        return;
      }

      try {
        await apiService.updateUser(selectedUser.id, { name, email, subject });
        toast.success(`Teacher "${name}" updated successfully`);
        resetForm();
        setShowEditDialog(false);
        // Refresh data
        window.location.reload();
      } catch (error) {
        console.error('Update teacher error:', error);
        toast.error('Failed to update teacher');
      }
    } else {
      if (!registrationNumber.trim() || !classId) {
        toast.error('Registration number and class are required');
        return;
      }

      try {
        await apiService.updateUser(selectedUser.id, {
          name,
          email,
          registration_number: registrationNumber,
          class_id: classId
        });
        toast.success(`Student "${name}" updated successfully`);
        resetForm();
        setShowEditDialog(false);
        // Refresh data
        window.location.reload();
      } catch (error) {
        console.error('Update student error:', error);
        toast.error('Failed to update student');
      }
    }

    resetForm();
    setShowEditDialog(false);
  };

  const handleDeleteUser = async () => {
    try {
      await apiService.deleteUser(selectedUser.id);
      if (activeTab === 'teachers') {
        toast.success('Teacher deleted successfully');
      } else {
        toast.success('Student deleted successfully');
      }
      setShowDeleteDialog(false);
      setSelectedUser(null);
      await refreshData();
    } catch (error) {
      console.error('Delete user error:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleToggleUserStatus = async (userId: string, userName: string) => {
    try {
      await apiService.toggleUserStatus(userId);
      toast.success(`User "${userName}" status updated`);
      // Refresh data without page reload
      await refreshData();
    } catch (error) {
      console.error('Toggle user status error:', error);
      toast.error('Failed to update user status');
    }
  };

  const refreshData = async () => {
    try {
      setLoading(true);
      const usersResponse = await apiService.getUsers(currentPage, itemsPerPage);
      const usersData = (usersResponse as any).users && Array.isArray((usersResponse as any).users) ? (usersResponse as any).users : [];

      setTeachers(usersData.filter((u: any) => u.role === 'teacher' || u.role === 'TEACHER'));
      setStudents(usersData.filter((u: any) => u.role === 'student' || u.role === 'STUDENT'));
      setTotalPages((usersResponse as any).pages || 1);
      setTotalUsers((usersResponse as any).total || 0);
    } catch (error) {
      console.error('Refresh data error:', error);
      toast.error('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setSubject('');
    setRegistrationNumber('');
    setClassId('');
    setSelectedUser(null);
  };

  const openEditDialog = (userData: any) => {
    setSelectedUser(userData);
    setName(userData.name);
    setEmail(userData.email);

    if (activeTab === 'teachers') {
      setSubject(userData.subject);
    } else {
      setRegistrationNumber(userData.registrationNumber);
      setClassId(userData.classId);
    }

    setShowEditDialog(true);
  };

  const handlePrintUsers = () => {
    const userList = activeTab === 'teachers' ? filteredTeachers : filteredStudents;
    const printContent = `
      <html>
        <head>
          <title>${activeTab === 'teachers' ? 'Teachers' : 'Students'} Report</title>
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
            <h2>${activeTab === 'teachers' ? 'Teachers' : 'Students'} Report</h2>
            <p>Generated: ${new Date().toLocaleDateString()}</p>
            <p>Total Records: ${userList.length}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Name</th>
                <th>Email</th>
                ${activeTab === 'teachers'
        ? '<th>Subject</th>'
        : '<th>Registration Number</th><th>Class</th>'
      }
              </tr>
            </thead>
            <tbody>
              ${userList.map((item, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${item.name}</td>
                  <td>${item.email}</td>
                  ${activeTab === 'teachers'
          ? `<td>${(item as any).subject}</td>`
          : `<td>${(item as any).registrationNumber}</td><td>${(item as any).className}</td>`
        }
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
            <h1 className="text-3xl">User Management</h1>
            <p className="text-muted-foreground">Manage teachers and students</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrintUsers}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add {activeTab === 'teachers' ? 'Teacher' : 'Student'}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b">
          <button
            onClick={() => {
              setActiveTab('teachers');
              setSearchTerm('');
            }}
            className={`px-4 py-2 -mb-px ${activeTab === 'teachers'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground'
              }`}
          >
            Teachers ({teachers.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('students');
              setSearchTerm('');
            }}
            className={`px-4 py-2 -mb-px ${activeTab === 'students'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground'
              }`}
          >
            Students ({students.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs uppercase">Email</th>
                {activeTab === 'teachers' ? (
                  <th className="px-6 py-3 text-left text-xs uppercase">Subject</th>
                ) : (
                  <>
                    <th className="px-6 py-3 text-left text-xs uppercase">Reg. Number</th>
                    <th className="px-6 py-3 text-left text-xs uppercase">Class</th>
                  </>
                )}
                <th className="px-6 py-3 text-left text-xs uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {activeTab === 'teachers' ? (
                filteredTeachers.length > 0 ? (
                  filteredTeachers.map((teacher) => (
                    <tr key={teacher.id}>
                      <td className="px-6 py-4 text-sm">{teacher.name}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{teacher.email}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{teacher.subject}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${teacher.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {teacher.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleUserStatus(teacher.id, teacher.name)}
                            title={teacher.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {teacher.is_active ? (
                              <div className="w-4 h-4 rounded-full bg-green-500"></div>
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-red-500"></div>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(teacher)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedUser(teacher);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No teachers found
                    </td>
                  </tr>
                )
              ) : (
                filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <tr key={student.id}>
                      <td className="px-6 py-4 text-sm">{student.name}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{student.email}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{student.registration_number}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{student.class_name}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${student.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {student.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleUserStatus(student.id, student.name)}
                            title={student.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {student.is_active ? (
                              <div className="w-4 h-4 rounded-full bg-green-500"></div>
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-red-500"></div>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(student)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedUser(student);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No students found
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalUsers)} of {totalUsers} users
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

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {activeTab === 'teachers' ? 'Teacher' : 'Student'}</DialogTitle>
            <DialogDescription>
              Create a new {activeTab === 'teachers' ? 'teacher' : 'student'} account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {activeTab === 'teachers' ? (
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="e.g., Mathematics"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="regNumber">Registration Number</Label>
                  <Input
                    id="regNumber"
                    placeholder="e.g., STU2024001"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Class</Label>
                  <Select value={classId} onValueChange={setClassId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              resetForm();
              setShowCreateDialog(false);
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {activeTab === 'teachers' ? 'Teacher' : 'Student'}</DialogTitle>
            <DialogDescription>
              Update {activeTab === 'teachers' ? 'teacher' : 'student'} information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editName">Name</Label>
              <Input
                id="editName"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="editEmail">Email</Label>
              <Input
                id="editEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {activeTab === 'teachers' ? (
              <div>
                <Label htmlFor="editSubject">Subject</Label>
                <Input
                  id="editSubject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="editRegNumber">Registration Number</Label>
                  <Input
                    id="editRegNumber"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Class</Label>
                  <Select value={classId} onValueChange={setClassId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              resetForm();
              setShowEditDialog(false);
            }}>
              Cancel
            </Button>
            <Button onClick={handleEditUser}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {activeTab === 'teachers' ? 'Teacher' : 'Student'}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedUser?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}