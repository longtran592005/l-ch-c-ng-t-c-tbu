import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types';
import { api } from '@/services/api'; // Import the API service

const AUTH_STORAGE_KEY = 'tbu_auth_token'; // Store token
const USER_STORAGE_KEY = 'tbu_user_data'; // Store user data

// Interface for backend auth tokens
interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Interface for context
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isBGH: boolean;
  canManageSchedule: boolean;
  isOffice: boolean;
  canManageUsers: boolean;
  canAccessAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  refreshUsers: () => void; // Keep for now, might be removed later if not needed
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);

  // Load user from localStorage when mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      const storedToken = localStorage.getItem(AUTH_STORAGE_KEY);

      if (storedUser && storedToken) {
        const parsedUser = JSON.parse(storedUser);
        // Optionally, you might want to verify the token with the backend here
        // For now, we'll just set the user based on stored data
        setUser({
          ...parsedUser,
          createdAt: new Date(parsedUser.createdAt),
          // Ensure other Date objects are parsed if necessary
        });
        // Set up API default headers with token
        // This part needs to be handled globally, e.g., in api.ts
      }
    } catch (error) {
      console.error('Error reading auth from localStorage:', error);
      logout(); // Clear potentially corrupted data
    }
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await api.post<{ user: User; tokens: AuthTokens }>('/auth/login', { email, password });

      const { user: loggedInUser, tokens } = response;

      // Store tokens and user data
      localStorage.setItem(AUTH_STORAGE_KEY, tokens.accessToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(loggedInUser));

      // Update user state
      setUser(loggedInUser);

      return { success: true, message: 'Đăng nhập thành công!' };
    } catch (error: any) {
      console.error('Login failed:', error);
      return { success: false, message: error.message || 'Email hoặc mật khẩu không đúng.' };
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  // Computed properties
  const isAuthenticated = user !== null;
  const isAdmin = user?.role === 'admin';
  const isBGH = user?.role === 'bgh';
  const isOffice = (user?.department || '').toLowerCase() === 'văn phòng' || user?.role === 'office';
  // Admin and BGH have schedule management rights
  const canManageSchedule = isAdmin || isBGH || isOffice;
  // Only admin can manage users
  const canManageUsers = isAdmin;
  // Access to admin area granted to admin, BGH, and office
  const canAccessAdmin = isAdmin || isBGH || isOffice;

  // This function is currently a placeholder, remove if not needed
  const refreshUsers = () => {
    // This function was part of the mock setup.
    // If user management is required, it should fetch fresh user data from backend.
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isAdmin,
    isBGH,
    canManageSchedule,
    isOffice,
    canManageUsers,
    canAccessAdmin,
    login,
    logout,
    refreshUsers,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}