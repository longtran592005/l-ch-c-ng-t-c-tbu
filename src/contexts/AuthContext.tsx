import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types';

// Key lưu trữ trong localStorage
const AUTH_STORAGE_KEY = 'tbu_auth';

// Interface cho context
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isBGH: boolean;
  canManageSchedule: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
}

// Tạo context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Dữ liệu người dùng mẫu (sẽ thay bằng API sau)
const mockUsers: Array<User & { password: string }> = [
  {
    id: '1',
    name: 'Quản trị viên',
    email: 'admin@tbu.edu.vn',
    role: 'admin',
    department: 'Văn phòng',
    position: 'Chánh Văn phòng',
    createdAt: new Date(),
    password: '123456',
  },
  {
    id: '2',
    name: 'PGS.TS Nguyễn Văn A',
    email: 'bgh@tbu.edu.vn',
    role: 'bgh',
    department: 'Ban Giám hiệu',
    position: 'Hiệu trưởng',
    createdAt: new Date(),
    password: '123456',
  },
  {
    id: '3',
    name: 'Nguyễn Văn B',
    email: 'staff@tbu.edu.vn',
    role: 'staff',
    department: 'Phòng Đào tạo',
    position: 'Chuyên viên',
    createdAt: new Date(),
    password: '123456',
  },
];

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);

  // Load user từ localStorage khi mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser({
          ...parsed,
          createdAt: new Date(parsed.createdAt),
        });
      }
    } catch (error) {
      console.error('Lỗi khi đọc auth từ localStorage:', error);
    }
  }, []);

  // Đăng nhập
  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    // Mô phỏng API call - trong thực tế sẽ gọi API backend
    await new Promise(resolve => setTimeout(resolve, 500));

    const foundUser = mockUsers.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (foundUser) {
      // Loại bỏ password trước khi lưu
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userWithoutPassword));
      return { success: true, message: 'Đăng nhập thành công!' };
    }

    return { success: false, message: 'Email hoặc mật khẩu không đúng.' };
  };

  // Đăng xuất
  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  // Computed properties
  const isAuthenticated = user !== null;
  const isAdmin = user?.role === 'admin';
  const isBGH = user?.role === 'bgh';
  // Admin và BGH có quyền quản lý lịch
  const canManageSchedule = isAdmin || isBGH;

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isAdmin,
    isBGH,
    canManageSchedule,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook để sử dụng context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth phải được sử dụng trong AuthProvider');
  }
  return context;
}
