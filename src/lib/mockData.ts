// Mock data for the application

export interface Question {
  id: string;
  text: string;
  type: 'mcq' | 'descriptive';
  options?: string[];
  correctAnswer?: number;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
}

export interface Quiz {
  id: string;
  title: string;
  subject: string;
  description: string;
  accessCode: string;
  timeLimit: number; // in minutes
  status: 'draft' | 'published';
  questions: Question[];
  startDate?: string;
  endDate?: string;
  createdBy: string;
  createdAt: string;
  classIds: string[]; // Classes this quiz is assigned to
}

export interface StudentAnswer {
  questionId: string;
  answer: string | number;
  marksAwarded?: number;
  feedback?: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  studentName: string;
  answers: StudentAnswer[];
  score: number;
  totalMarks: number;
  status: 'graded' | 'pending';
  submittedAt: string;
  violations: number;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  registrationNumber: string;
  classId: string;
  className: string;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  subject: string;
  classIds: string[];
}

export interface Class {
  id: string;
  name: string;
  teacherId?: string;
  teacherName?: string;
  studentIds: string[];
  studentCount: number;
}

// User Credentials for Authentication
export interface UserCredential {
  id: string;
  email: string;
  password: string;
  role: 'admin' | 'teacher' | 'student';
  registrationNumber?: string; // For students
  isClaimed?: boolean; // For students - whether they've set their password
}

export let userCredentials: UserCredential[] = [
  // Admin accounts
  { id: '1', email: 'admin@quiz.com', password: 'admin123', role: 'admin' },
  
  // Teacher accounts
  { id: '2', email: 'john@teacher.com', password: 'teacher123', role: 'teacher' },
  { id: 't2', email: 'sarah@teacher.com', password: 'teacher123', role: 'teacher' },
  { id: 't3', email: 'michael@teacher.com', password: 'teacher123', role: 'teacher' },
  
  // Student accounts (some claimed, some unclaimed)
  { id: '101', email: 'alice@student.com', password: 'student123', role: 'student', registrationNumber: 'STU2024001', isClaimed: true },
  { id: '102', email: 'bob@student.com', password: 'student123', role: 'student', registrationNumber: 'STU2024002', isClaimed: true },
  { id: '103', email: 'charlie@student.com', password: '', role: 'student', registrationNumber: 'STU2024003', isClaimed: false },
  { id: '104', email: 'diana@student.com', password: '', role: 'student', registrationNumber: 'STU2024004', isClaimed: false },
  { id: '105', email: 'eve@student.com', password: '', role: 'student', registrationNumber: 'STU2024005', isClaimed: false },
  { id: '106', email: 'frank@student.com', password: '', role: 'student', registrationNumber: 'STU2024006', isClaimed: false },
];

// Password reset tokens (temporary storage)
export interface PasswordResetToken {
  email: string;
  token: string;
  expiresAt: Date;
}

export let passwordResetTokens: PasswordResetToken[] = [];

// Questions Bank
export let questionBank: Question[] = [
  {
    id: 'q1',
    text: 'What is the capital of France?',
    type: 'mcq',
    options: ['London', 'Berlin', 'Paris', 'Madrid'],
    correctAnswer: 2,
    topic: 'Geography',
    difficulty: 'easy',
    marks: 2,
  },
  {
    id: 'q2',
    text: 'Explain the process of photosynthesis.',
    type: 'descriptive',
    topic: 'Biology',
    difficulty: 'medium',
    marks: 5,
  },
  {
    id: 'q3',
    text: 'What is 15 × 12?',
    type: 'mcq',
    options: ['150', '180', '200', '175'],
    correctAnswer: 1,
    topic: 'Mathematics',
    difficulty: 'easy',
    marks: 2,
  },
  {
    id: 'q4',
    text: 'Discuss the causes of World War II.',
    type: 'descriptive',
    topic: 'History',
    difficulty: 'hard',
    marks: 10,
  },
  {
    id: 'q5',
    text: 'Which programming language is known for web development?',
    type: 'mcq',
    options: ['Python', 'JavaScript', 'C++', 'Java'],
    correctAnswer: 1,
    topic: 'Computer Science',
    difficulty: 'medium',
    marks: 3,
  },
];

// Quizzes
export let quizzes: Quiz[] = [
  {
    id: 'quiz1',
    title: 'Mathematics Quiz - Chapter 1',
    subject: 'Mathematics',
    description: 'Basic algebra and arithmetic',
    accessCode: 'MATH001',
    timeLimit: 30,
    status: 'published',
    questions: [questionBank[2], questionBank[0]],
    startDate: '2024-12-01',
    endDate: '2024-12-31',
    createdBy: '2',
    createdAt: '2024-11-15',
    classIds: ['class1', 'class2'],
  },
  {
    id: 'quiz2',
    title: 'Science Quiz - Biology Basics',
    subject: 'Science',
    description: 'Understanding photosynthesis and cell biology',
    accessCode: 'SCI001',
    timeLimit: 45,
    status: 'published',
    questions: [questionBank[1], questionBank[0]],
    startDate: '2024-12-01',
    createdBy: '2',
    createdAt: '2024-11-20',
    classIds: ['class2', 'class3'],
  },
  {
    id: 'quiz3',
    title: 'History Quiz - World Wars',
    subject: 'History',
    description: 'Comprehensive quiz on World War II',
    accessCode: 'HIST001',
    timeLimit: 60,
    status: 'draft',
    questions: [questionBank[3]],
    createdBy: '2',
    createdAt: '2024-12-01',
    classIds: ['class1'],
  },
  {
    id: 'quiz4',
    title: 'Computer Science Fundamentals',
    subject: 'Computer Science',
    description: 'Programming basics and web development',
    accessCode: 'CS001',
    timeLimit: 40,
    status: 'published',
    questions: [questionBank[4], questionBank[2]],
    startDate: '2024-12-01',
    endDate: '2024-12-25',
    createdBy: '2',
    createdAt: '2024-11-25',
    classIds: ['class3'],
  },
];

// Students
export let students: Student[] = [
  { id: '101', name: 'Alice Johnson', email: 'alice@student.com', registrationNumber: 'STU2024001', classId: 'class1', className: 'Class 10A' },
  { id: '102', name: 'Bob Smith', email: 'bob@student.com', registrationNumber: 'STU2024002', classId: 'class1', className: 'Class 10A' },
  { id: '103', name: 'Charlie Brown', email: 'charlie@student.com', registrationNumber: 'STU2024003', classId: 'class2', className: 'Class 10B' },
  { id: '104', name: 'Diana Prince', email: 'diana@student.com', registrationNumber: 'STU2024004', classId: 'class2', className: 'Class 10B' },
  { id: '105', name: 'Ethan Hunt', email: 'ethan@student.com', registrationNumber: 'STU2024005', classId: 'class1', className: 'Class 10A' },
  { id: '106', name: 'Fiona Gallagher', email: 'fiona@student.com', registrationNumber: 'STU2024006', classId: 'class3', className: 'Class 11A' },
];

// Teachers
export let teachers: Teacher[] = [
  { id: '2', name: 'John Teacher', email: 'teacher@quiz.com', subject: 'Mathematics', classIds: ['class1', 'class2'] },
  { id: 't2', name: 'Sarah Williams', email: 'sarah@teacher.com', subject: 'Science', classIds: ['class2', 'class3'] },
  { id: 't3', name: 'Michael Davis', email: 'michael@teacher.com', subject: 'History', classIds: ['class1'] },
];

// Classes
export let classes: Class[] = [
  { id: 'class1', name: 'Class 10A', teacherId: '2', teacherName: 'John Teacher', studentIds: ['101', '102', '105'], studentCount: 3 },
  { id: 'class2', name: 'Class 10B', teacherId: '2', teacherName: 'John Teacher', studentIds: ['103', '104'], studentCount: 2 },
  { id: 'class3', name: 'Class 11A', teacherId: 't2', teacherName: 'Sarah Williams', studentIds: ['106'], studentCount: 1 },
  { id: 'class4', name: 'Class 11B', studentIds: [], studentCount: 0 },
];

// Quiz Attempts
export let quizAttempts: QuizAttempt[] = [
  {
    id: 'attempt1',
    quizId: 'quiz1',
    studentId: '101',
    studentName: 'Alice Johnson',
    answers: [
      { questionId: 'q3', answer: 1, marksAwarded: 2 },
      { questionId: 'q1', answer: 2, marksAwarded: 2 },
    ],
    score: 4,
    totalMarks: 4,
    status: 'graded',
    submittedAt: '2024-12-03T10:30:00',
    violations: 0,
  },
  {
    id: 'attempt2',
    quizId: 'quiz1',
    studentId: '102',
    studentName: 'Bob Smith',
    answers: [
      { questionId: 'q3', answer: 0, marksAwarded: 0 },
      { questionId: 'q1', answer: 2, marksAwarded: 2 },
    ],
    score: 2,
    totalMarks: 4,
    status: 'graded',
    submittedAt: '2024-12-03T11:15:00',
    violations: 1,
  },
  {
    id: 'attempt3',
    quizId: 'quiz2',
    studentId: '101',
    studentName: 'Alice Johnson',
    answers: [
      { questionId: 'q2', answer: 'Photosynthesis is the process by which plants convert light energy into chemical energy...' },
      { questionId: 'q1', answer: 2, marksAwarded: 2 },
    ],
    score: 2,
    totalMarks: 7,
    status: 'pending',
    submittedAt: '2024-12-04T09:20:00',
    violations: 0,
  },
  {
    id: 'attempt4',
    quizId: 'quiz4',
    studentId: '103',
    studentName: 'Charlie Brown',
    answers: [
      { questionId: 'q5', answer: 1, marksAwarded: 3 },
      { questionId: 'q3', answer: 1, marksAwarded: 2 },
    ],
    score: 5,
    totalMarks: 5,
    status: 'graded',
    submittedAt: '2024-12-04T14:45:00',
    violations: 0,
  },
];

// Helper functions for CRUD operations
export const addStudent = (student: Student) => {
  students.push(student);
  // Update class student count
  const classIdx = classes.findIndex(c => c.id === student.classId);
  if (classIdx !== -1) {
    classes[classIdx].studentIds.push(student.id);
    classes[classIdx].studentCount = classes[classIdx].studentIds.length;
  }
};

export const updateStudent = (id: string, updates: Partial<Student>) => {
  const idx = students.findIndex(s => s.id === id);
  if (idx !== -1) {
    const oldClassId = students[idx].classId;
    students[idx] = { ...students[idx], ...updates };
    
    // Update class if changed
    if (updates.classId && oldClassId !== updates.classId) {
      const oldClass = classes.find(c => c.id === oldClassId);
      if (oldClass) {
        oldClass.studentIds = oldClass.studentIds.filter(sid => sid !== id);
        oldClass.studentCount = oldClass.studentIds.length;
      }
      const newClass = classes.find(c => c.id === updates.classId);
      if (newClass) {
        newClass.studentIds.push(id);
        newClass.studentCount = newClass.studentIds.length;
      }
    }
  }
};

export const deleteStudent = (id: string) => {
  const student = students.find(s => s.id === id);
  if (student) {
    const classIdx = classes.findIndex(c => c.id === student.classId);
    if (classIdx !== -1) {
      classes[classIdx].studentIds = classes[classIdx].studentIds.filter(sid => sid !== id);
      classes[classIdx].studentCount = classes[classIdx].studentIds.length;
    }
  }
  students = students.filter(s => s.id !== id);
};

export const addTeacher = (teacher: Teacher) => {
  teachers.push(teacher);
};

export const updateTeacher = (id: string, updates: Partial<Teacher>) => {
  const idx = teachers.findIndex(t => t.id === id);
  if (idx !== -1) {
    teachers[idx] = { ...teachers[idx], ...updates };
  }
};

export const deleteTeacher = (id: string) => {
  // Remove teacher from classes
  classes.forEach(c => {
    if (c.teacherId === id) {
      c.teacherId = undefined;
      c.teacherName = undefined;
    }
  });
  teachers = teachers.filter(t => t.id !== id);
};

export const addClass = (newClass: Class) => {
  classes.push(newClass);
};

export const updateClass = (id: string, updates: Partial<Class>) => {
  const idx = classes.findIndex(c => c.id === id);
  if (idx !== -1) {
    classes[idx] = { ...classes[idx], ...updates };
  }
};

export const deleteClass = (id: string) => {
  // Update students in this class
  students.forEach(s => {
    if (s.classId === id) {
      s.classId = '';
      s.className = 'Unassigned';
    }
  });
  classes = classes.filter(c => c.id !== id);
};

export const assignTeacherToClass = (classId: string, teacherId: string) => {
  const teacher = teachers.find(t => t.id === teacherId);
  const classIdx = classes.findIndex(c => c.id === classId);
  
  if (teacher && classIdx !== -1) {
    classes[classIdx].teacherId = teacherId;
    classes[classIdx].teacherName = teacher.name;
    
    if (!teacher.classIds.includes(classId)) {
      teacher.classIds.push(classId);
    }
  }
};

export const assignStudentToClass = (studentId: string, classId: string) => {
  const student = students.find(s => s.id === studentId);
  const newClass = classes.find(c => c.id === classId);
  
  if (student && newClass) {
    // Remove from old class
    const oldClass = classes.find(c => c.id === student.classId);
    if (oldClass) {
      oldClass.studentIds = oldClass.studentIds.filter(sid => sid !== studentId);
      oldClass.studentCount = oldClass.studentIds.length;
    }
    
    // Add to new class
    student.classId = classId;
    student.className = newClass.name;
    
    if (!newClass.studentIds.includes(studentId)) {
      newClass.studentIds.push(studentId);
      newClass.studentCount = newClass.studentIds.length;
    }
  }
};

export const bulkImportStudents = (studentsData: Array<{
  name: string;
  email: string;
  registrationNumber: string;
  className: string;
}>) => {
  const imported: Student[] = [];
  
  studentsData.forEach(data => {
    // Find or create class
    let classObj = classes.find(c => c.name.toLowerCase() === data.className.toLowerCase());
    if (!classObj) {
      classObj = {
        id: `class${Date.now()}${Math.random()}`,
        name: data.className,
        studentIds: [],
        studentCount: 0,
      };
      classes.push(classObj);
    }
    
    // Create student
    const student: Student = {
      id: `stu${Date.now()}${Math.random()}`,
      name: data.name,
      email: data.email,
      registrationNumber: data.registrationNumber,
      classId: classObj.id,
      className: classObj.name,
    };
    
    students.push(student);
    classObj.studentIds.push(student.id);
    classObj.studentCount = classObj.studentIds.length;
    imported.push(student);
  });
  
  return imported;
};

// Quiz CRUD operations
export const addQuiz = (quiz: Quiz) => {
  quizzes.push(quiz);
};

export const updateQuiz = (quizId: string, updates: Partial<Quiz>) => {
  const index = quizzes.findIndex(q => q.id === quizId);
  if (index !== -1) {
    quizzes[index] = { ...quizzes[index], ...updates };
  }
};

export const deleteQuiz = (quizId: string) => {
  const index = quizzes.findIndex(q => q.id === quizId);
  if (index !== -1) {
    quizzes.splice(index, 1);
  }
};

// Question Bank CRUD operations
export const addQuestion = (question: Question) => {
  questionBank.push(question);
};

export const updateQuestion = (questionId: string, updates: Partial<Question>) => {
  const index = questionBank.findIndex(q => q.id === questionId);
  if (index !== -1) {
    questionBank[index] = { ...questionBank[index], ...updates };
  }
};

export const deleteQuestion = (questionId: string) => {
  const index = questionBank.findIndex(q => q.id === questionId);
  if (index !== -1) {
    questionBank.splice(index, 1);
  }
};

// Authentication Helper Functions
export const authenticateUser = (emailOrRegNo: string, password: string) => {
  // Try to find by email first
  let credential = userCredentials.find(
    c => c.email.toLowerCase() === emailOrRegNo.toLowerCase() && c.password === password
  );
  
  // If not found and looks like registration number, try that
  if (!credential && emailOrRegNo.toUpperCase().startsWith('STU')) {
    credential = userCredentials.find(
      c => c.registrationNumber === emailOrRegNo.toUpperCase() && c.password === password
    );
  }
  
  if (!credential) return null;
  
  // Check if student account is claimed
  if (credential.role === 'student' && !credential.isClaimed) {
    return { error: 'Account not claimed. Please claim your account first.' };
  }
  
  // Return user data based on role
  if (credential.role === 'admin') {
    return {
      id: credential.id,
      name: 'Admin User',
      email: credential.email,
      role: 'admin' as const,
    };
  } else if (credential.role === 'teacher') {
    const teacher = teachers.find(t => t.id === credential.id);
    if (!teacher) return null;
    return {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      role: 'teacher' as const,
    };
  } else if (credential.role === 'student') {
    const student = students.find(s => s.id === credential.id);
    if (!student) return null;
    return {
      id: student.id,
      name: student.name,
      email: student.email,
      role: 'student' as const,
      registrationNumber: student.registrationNumber,
    };
  }
  
  return null;
};

export const claimStudentAccount = (registrationNumber: string, password: string) => {
  // Find student
  const student = students.find(s => s.registrationNumber === registrationNumber);
  if (!student) {
    return { error: 'Registration number not found. Please contact your administrator.' };
  }
  
  // Find credential
  const credential = userCredentials.find(c => c.id === student.id);
  if (!credential) {
    return { error: 'Account setup error. Please contact administrator.' };
  }
  
  // Check if already claimed
  if (credential.isClaimed) {
    return { error: 'This account has already been claimed. Please login instead.' };
  }
  
  // Set password and mark as claimed
  credential.password = password;
  credential.isClaimed = true;
  
  return {
    id: student.id,
    name: student.name,
    email: student.email,
    role: 'student' as const,
    registrationNumber: student.registrationNumber,
  };
};

export const generatePasswordResetToken = (email: string) => {
  // Check if user exists
  const credential = userCredentials.find(c => c.email.toLowerCase() === email.toLowerCase());
  if (!credential) {
    return { error: 'Email address not found in our system.' };
  }
  
  // Generate 6-digit code
  const token = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Set expiry to 15 minutes from now
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15);
  
  // Remove old tokens for this email
  passwordResetTokens = passwordResetTokens.filter(t => t.email !== email);
  
  // Add new token
  passwordResetTokens.push({ email, token, expiresAt });
  
  return { success: true, token }; // In real app, send via email, here we return it
};

export const verifyPasswordResetToken = (email: string, token: string) => {
  const resetToken = passwordResetTokens.find(
    t => t.email.toLowerCase() === email.toLowerCase() && t.token === token
  );
  
  if (!resetToken) {
    return { error: 'Invalid reset code.' };
  }
  
  if (new Date() > resetToken.expiresAt) {
    return { error: 'Reset code has expired. Please request a new one.' };
  }
  
  return { success: true };
};

export const resetPassword = (email: string, token: string, newPassword: string) => {
  // Verify token first
  const verification = verifyPasswordResetToken(email, token);
  if ('error' in verification) {
    return verification;
  }
  
  // Find user credential
  const credential = userCredentials.find(c => c.email.toLowerCase() === email.toLowerCase());
  if (!credential) {
    return { error: 'User not found.' };
  }
  
  // Update password
  credential.password = newPassword;
  
  // Remove used token
  passwordResetTokens = passwordResetTokens.filter(
    t => !(t.email.toLowerCase() === email.toLowerCase() && t.token === token)
  );
  
  return { success: true };
};

export const updateUserPassword = (userId: string, currentPassword: string, newPassword: string) => {
  const credential = userCredentials.find(c => c.id === userId);
  
  if (!credential) {
    return { error: 'User not found.' };
  }
  
  if (credential.password !== currentPassword) {
    return { error: 'Current password is incorrect.' };
  }
  
  credential.password = newPassword;
  return { success: true };
};