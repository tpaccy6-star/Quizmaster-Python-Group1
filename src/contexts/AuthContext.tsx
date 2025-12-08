// Authentication Context
// Manages user authentication state across the app

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiService, LoginCredentials, RegisterData } from '../lib/api';

export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    registration_number?: string;
    class_id?: string;
    subject?: string;
    department?: string;
    bio?: string;
}

interface AuthContextType {
    currentUser: User | null;
    isLoading: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (userData: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
    refreshToken: () => Promise<void>;
    forgotPassword: (email: string) => Promise<void>;
    resetPassword: (token: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for existing session on mount
        const initializeAuth = async () => {
            try {
                const accessToken = localStorage.getItem('accessToken');
                if (accessToken) {
                    // Validate token by fetching current user
                    const response = await apiService.getCurrentUser() as any;
                    if (response.user) {
                        setCurrentUser(response.user);
                    } else {
                        // Token invalid, clear storage
                        clearAuthData();
                    }
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
                clearAuthData();
            } finally {
                setIsLoading(false);
            }
        };

        initializeAuth();
    }, []);

    const clearAuthData = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('currentUser');
        setCurrentUser(null);
    };

    const storeAuthData = (user: User, accessToken: string, refreshToken: string) => {
        setCurrentUser(user);
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('currentUser', JSON.stringify(user));
    };

    const login = async (credentials: LoginCredentials) => {
        try {
            const response = await apiService.login(credentials) as any;

            if (response.access_token && response.refresh_token && response.user) {
                storeAuthData(response.user, response.access_token, response.refresh_token);
            } else {
                throw new Error('Invalid login response');
            }
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const register = async (userData: RegisterData) => {
        try {
            const response = await apiService.register(userData) as any;

            if (response.access_token && response.refresh_token && response.user) {
                storeAuthData(response.user, response.access_token, response.refresh_token);
            } else {
                throw new Error('Invalid registration response');
            }
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await apiService.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            clearAuthData();
        }
    };

    const refreshToken = async () => {
        try {
            await apiService.refreshToken();
            // After refresh token, update current user
            const response = await apiService.getCurrentUser() as any;
            if (response.user) {
                setCurrentUser(response.user);
                localStorage.setItem('currentUser', JSON.stringify(response.user));
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            clearAuthData();
            throw error;
        }
    };

    const forgotPassword = async (email: string) => {
        try {
            await apiService.forgotPassword(email);
        } catch (error) {
            console.error('Forgot password error:', error);
            throw error;
        }
    };

    const resetPassword = async (token: string, newPassword: string) => {
        try {
            await apiService.resetPassword(token, newPassword);
        } catch (error) {
            console.error('Reset password error:', error);
            throw error;
        }
    };

    const value: AuthContextType = {
        currentUser,
        isLoading,
        login,
        register,
        logout,
        refreshToken,
        forgotPassword,
        resetPassword,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
