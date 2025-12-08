import { useState, useEffect } from 'react';
import DashboardLayout from '../shared/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { Users, BookOpen, Search, Eye, ArrowLeft } from 'lucide-react';
import { apiService } from '../../lib/api';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface Class {
    id: string;
    name: string;
    section?: string;
    academic_year?: string;
    student_count: number;
    teacher_count: number;
    teachers: any[];
}

interface Student {
    id: string;
    name: string;
    email: string;
    registration_number?: string;
    class_id: string;
}

export default function TeacherClasses() {
    const { currentUser: user, logout } = useAuth();

    if (!user) {
        return <div>Loading...</div>;
    }

    const [classes, setClasses] = useState<Class[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);
    const [loading, setLoading] = useState(true);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const response = await apiService.getTeacherClasses();
                const classesData = (response as any).classes || response || [];
                setClasses(Array.isArray(classesData) ? classesData : []);
            } catch (error) {
                console.error('Failed to fetch classes:', error);
                toast.error('Failed to load classes');
                setClasses([]);
            } finally {
                setLoading(false);
            }
        };

        fetchClasses();
    }, []);

    const handleViewStudents = async (classItem: Class) => {
        setSelectedClass(classItem);
        setStudentsLoading(true);
        setSearchTerm('');

        try {
            // Get all students from teacher's classes and filter by selected class
            const response = await apiService.getTeacherStudents();
            const allStudents = (response as any).students || response || [];
            const classStudents = Array.isArray(allStudents)
                ? allStudents.filter((student: any) => student.class_id === classItem.id)
                : [];
            setStudents(classStudents);
        } catch (error) {
            console.error('Failed to fetch students:', error);
            toast.error('Failed to load students');
            setStudents([]);
        } finally {
            setStudentsLoading(false);
        }
    };

    const handleBackToClasses = () => {
        setSelectedClass(null);
        setStudents([]);
        setSearchTerm('');
    };

    const filteredStudents = students.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.registration_number && student.registration_number.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) {
        return (
            <DashboardLayout user={user} onLogout={logout}>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout user={user} onLogout={logout}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl text-gray-900 dark:text-white">
                            {selectedClass ? `Students - ${selectedClass.name}` : 'My Classes'}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            {selectedClass
                                ? `Viewing ${filteredStudents.length} students in ${selectedClass.name}`
                                : `Manage your assigned classes and students`
                            }
                        </p>
                    </div>
                    {selectedClass && (
                        <Button onClick={handleBackToClasses} variant="outline">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Classes
                        </Button>
                    )}
                </div>

                {!selectedClass ? (
                    /* Classes View */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {classes.map((classItem) => (
                            <Card key={classItem.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-lg">{classItem.name}</CardTitle>
                                            <CardDescription className="mt-1">
                                                {classItem.section && `Section ${classItem.section}`}
                                                {classItem.academic_year && ` • ${classItem.academic_year}`}
                                            </CardDescription>
                                        </div>
                                        <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                <Users className="w-4 h-4" />
                                                <span>{classItem.student_count} students</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                <BookOpen className="w-4 h-4" />
                                                <span>{classItem.teacher_count} teachers</span>
                                            </div>
                                        </div>

                                        {classItem.teachers && classItem.teachers.length > 0 && (
                                            <div className="text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">Teachers: </span>
                                                <span className="text-gray-900 dark:text-white">
                                                    {classItem.teachers.map((teacher: any) => teacher.name).join(', ')}
                                                </span>
                                            </div>
                                        )}

                                        <Button
                                            onClick={() => handleViewStudents(classItem)}
                                            className="w-full mt-4"
                                            variant="outline"
                                        >
                                            <Eye className="w-4 h-4 mr-2" />
                                            View Students
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    /* Students View */
                    <div className="space-y-6">
                        {/* Search Bar */}
                        <div className="flex items-center gap-4">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Search students by name, email, or registration number..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                {filteredStudents.length} of {students.length} students
                            </div>
                        </div>

                        {/* Students Table */}
                        {studentsLoading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    Name
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    Email
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    Registration Number
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    Class
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {filteredStudents.map((student) => (
                                                <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {student.name}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                                            {student.email}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                                            {student.registration_number || 'N/A'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                                            {selectedClass.name}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {filteredStudents.length === 0 && (
                                        <div className="text-center py-12">
                                            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                            <p className="text-gray-600 dark:text-gray-400">
                                                {searchTerm ? 'No students found matching your search' : 'No students in this class'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Empty State for Classes */}
                {!selectedClass && classes.length === 0 && (
                    <div className="text-center py-12">
                        <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">
                            No classes assigned to you yet.
                        </p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
