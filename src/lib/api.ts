// API Service for QuizMaster Backend
// Connects React frontend to Flask backend

const API_BASE_URL = 'http://127.0.0.1:5000/api';

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
    name: string;
    role: 'admin' | 'teacher' | 'student';
    registration_number?: string;
    date_of_birth?: string;
    subject?: string;
    department?: string;
    bio?: string;
}

export interface ApiResponse<T = any> {
    data?: T;
    message?: string;
    error?: string;
    details?: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    pages: number;
    current_page: number;
}

class ApiService {
    private getAuthHeaders(): Record<string, string> {
        const token = localStorage.getItem('accessToken');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(),
            ...options.headers,
        };

        try {
            const response = await fetch(url, { ...options, headers });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.details || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Authentication endpoints
    async login(credentials: LoginCredentials) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
    }

    async register(userData: RegisterData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    }

    async refreshToken() {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const response = await this.request('/auth/refresh', {
            method: 'POST',
        }) as any;

        if (response.data?.access_token) {
            localStorage.setItem('accessToken', response.data.access_token);
        }

        return response;
    }

    async logout() {
        const refreshToken = localStorage.getItem('refreshToken');
        return this.request('/auth/logout', {
            method: 'POST',
            body: JSON.stringify({ refresh_token: refreshToken }),
        });
    }

    async getCurrentUser() {
        return this.request('/auth/me');
    }

    async forgotPassword(email: string) {
        return this.request('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    }

    async resetPassword(token: string, newPassword: string) {
        return this.request('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, new_password: newPassword }),
        });
    }

    // Admin endpoints
    async getUsers(page = 1, perPage = 20, roleFilter?: string, search?: string) {
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: perPage.toString(),
        });

        if (roleFilter) params.append('role', roleFilter);
        if (search) params.append('search', search);

        return this.request(`/admin/users?${params}`);
    }

    async toggleUserStatus(userId: string) {
        return this.request(`/admin/users/${userId}/toggle-active`, {
            method: 'POST',
        });
    }

    async getClasses(page = 1, perPage = 20, search?: string) {
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: perPage.toString(),
        });

        if (search) params.append('search', search);

        return this.request(`/admin/classes?${params}`);
    }

    async createClass(classData: any) {
        return this.request('/admin/classes', {
            method: 'POST',
            body: JSON.stringify(classData),
        });
    }

    async updateClass(classId: string, classData: any) {
        return this.request(`/admin/classes/${classId}`, {
            method: 'PUT',
            body: JSON.stringify(classData),
        });
    }

    async deleteClass(classId: string) {
        return this.request(`/admin/classes/${classId}`, {
            method: 'DELETE',
        });
    }

    async assignTeacherToClass(classId: string, teacherId: string) {
        return this.request(`/admin/classes/${classId}/assign-teacher`, {
            method: 'POST',
            body: JSON.stringify({ teacher_id: teacherId }),
        });
    }

    async assignStudentToClass(classId: string, studentId: string) {
        return this.request(`/admin/classes/${classId}/assign-student`, {
            method: 'POST',
            body: JSON.stringify({ student_id: studentId }),
        });
    }

    async createUser(userData: any) {
        return this.request('/admin/users', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    }

    async updateUser(userId: string, userData: any) {
        return this.request(`/admin/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(userData),
        });
    }

    async deleteUser(userId: string) {
        return this.request(`/admin/users/${userId}`, {
            method: 'DELETE',
        });
    }

    async getDashboardStats() {
        return this.request('/admin/dashboard/stats');
    }

    // Teacher endpoints
    async getTeacherDashboard() {
        return this.request('/teacher/dashboard');
    }

    async getTeacherClasses() {
        return this.request('/teacher/classes');
    }

    async getTeacherStudents() {
        return this.request('/teacher/students');
    }

    async getTeacherQuizzes(page = 1, perPage = 10, statusFilter?: string) {
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: perPage.toString(),
        });

        if (statusFilter) params.append('status', statusFilter);

        return this.request(`/teacher/quizzes?${params}`);
    }

    async getPendingGrading(page = 1, perPage = 20) {
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: perPage.toString(),
        });

        return this.request(`/teacher/grading/pending?${params}`);
    }

    async gradeAnswer(attemptId: string, questionId: string, marksAwarded: number, feedback?: string) {
        return this.request('/teacher/grade-answer', {
            method: 'POST',
            body: JSON.stringify({
                attempt_id: attemptId,
                question_id: questionId,
                marks_awarded: marksAwarded,
                feedback: feedback || '',
            }),
        });
    }

    // Student endpoints
    async getStudentDashboard() {
        return this.request('/student/dashboard');
    }

    async getAvailableQuizzes() {
        return this.request('/student/quizzes');
    }

    async getStudentResults(page = 1, perPage = 10) {
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: perPage.toString(),
        });

        return this.request(`/student/results?${params}`);
    }

    async startQuiz(quizId: string) {
        return this.request(`/student/quiz/${quizId}/start`, {
            method: 'POST',
        });
    }

    async submitAnswer(attemptId: string, questionId: string, answer: any) {
        return this.request(`/student/attempt/${attemptId}/answer`, {
            method: 'POST',
            body: JSON.stringify({
                question_id: questionId,
                answer,
            }),
        });
    }

    async submitQuiz(attemptId: string) {
        return this.request(`/student/attempt/${attemptId}/submit`, {
            method: 'POST',
        });
    }

    // Quiz endpoints
    async getQuizzes(page = 1, perPage = 10, statusFilter?: string) {
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: perPage.toString(),
        });

        if (statusFilter) params.append('status', statusFilter);

        return this.request(`/quizzes/?${params}`);
    }

    async getQuiz(quizId: string, includeQuestions = false) {
        const params = new URLSearchParams({
            include_questions: includeQuestions.toString(),
        });

        return this.request(`/quizzes/${quizId}?${params}`);
    }

    async createQuiz(quizData: any) {
        return this.request('/quizzes/', {
            method: 'POST',
            body: JSON.stringify(quizData),
        });
    }

    async updateQuiz(quizId: string, quizData: any) {
        return this.request(`/quizzes/${quizId}`, {
            method: 'PUT',
            body: JSON.stringify(quizData),
        });
    }

    async publishQuiz(quizId: string) {
        return this.request(`/quizzes/${quizId}/publish`, {
            method: 'POST',
        });
    }

    async addQuestionToQuiz(quizId: string, questionData: any) {
        return this.request(`/quizzes/${quizId}/questions`, {
            method: 'POST',
            body: JSON.stringify(questionData),
        });
    }

    async deleteQuiz(quizId: string) {
        return this.request(`/quizzes/${quizId}`, {
            method: 'DELETE',
        });
    }

    async getQuestionBank(page = 1, perPage = 20, questionType?: string, topic?: string, difficulty?: string) {
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: perPage.toString(),
        });
        if (difficulty) params.append('difficulty', difficulty);

        return this.request(`/quiz/questions?${params}`);
    }

    async createQuestion(questionData: any) {
        return this.request('/quiz/questions', {
            method: 'POST',
            body: JSON.stringify(questionData),
        });
    }

    // Attempt endpoints
    async getAttempt(attemptId: string) {
        return this.request(`/attempts/${attemptId}`);
    }

    async getStudentAttempts(studentId: string, page = 1, perPage = 20, quizId?: string) {
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: perPage.toString(),
        });

        if (quizId) params.append('quiz_id', quizId);

        return this.request(`/attempts/student/${studentId}?${params}`);
    }

    async getQuizAttempts(quizId: string, page = 1, perPage = 20) {
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: perPage.toString(),
        });

        return this.request(`/attempts/quiz/${quizId}?${params}`);
    }

    async recordViolation(attemptId: string, violationType: string, questionIndex?: number, extraData?: any) {
        return this.request(`/attempts/${attemptId}/violations`, {
            method: 'POST',
            body: JSON.stringify({
                violation_type: violationType,
                question_index: questionIndex,
                extra_data: extraData,
            }),
        });
    }

    // Notification endpoints
    async getNotifications(unreadOnly = false, limit = 50, category?: string) {
        const params = new URLSearchParams({
            unread_only: unreadOnly.toString(),
            limit: limit.toString(),
        });

        if (category) params.append('category', category);

        return this.request(`/notifications/?${params}`);
    }

    async markNotificationAsRead(notificationId: string) {
        return this.request(`/notifications/${notificationId}/read`, {
            method: 'POST',
        });
    }

    async markAllNotificationsAsRead() {
        return this.request('/notifications/read-all', {
            method: 'POST',
        });
    }

    async getUnreadCount() {
        return this.request('/notifications/unread-count');
    }
}

export const apiService = new ApiService();
export default apiService;
