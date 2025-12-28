import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types';

// Key lưu trữ trong localStorage
const AUTH_STORAGE_KEY = 'tbu_auth';
const USERS_STORAGE_KEY = 'tbu_users';

// Interface cho context
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isBGH: boolean;
  canManageSchedule: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  refreshUsers: () => void;
}

// Tạo context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Dữ liệu người dùng mặc định
const defaultUsers: Array<User & { password: string; status: string }> = [
  {
    id: '1',
    name: 'Quản trị viên',
    email: 'admin@tbu.edu.vn',
    role: 'admin',
    department: 'Văn phòng',
    position: 'Chánh Văn phòng',
    createdAt: new Date(),
    password: '123456',
    status: 'active',
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
    status: 'active',
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
    status: 'active',
  },
];

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);

  // Khởi tạo users trong localStorage nếu chưa có
  useEffect(() => {
    const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (!storedUsers) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(defaultUsers));
    }
  }, []);

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

  // Lấy danh sách users từ localStorage
  const getUsers = (): Array<User & { password: string; status: string }> => {
    try {
      const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
      return storedUsers ? JSON.parse(storedUsers) : defaultUsers;
    } catch {
      return defaultUsers;
    }
  };

  // Refresh users - để các component khác có thể gọi
  const refreshUsers = () => {
    // Trigger re-render if needed
  };

  // Đăng nhập
  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    // Mô phỏng API call
    await new Promise(resolve => setTimeout(resolve, 500));

    const users = getUsers();
    const foundUser = users.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (!foundUser) {
      return { success: false, message: 'Email hoặc mật khẩu không đúng.' };
    }

    if (foundUser.status !== 'active') {
      return { success: false, message: 'Tài khoản đã bị vô hiệu hóa.' };
    }

    // Loại bỏ password trước khi lưu
    const { password: _, status, ...userWithoutPassword } = foundUser;
    setUser(userWithoutPassword);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userWithoutPassword));
    return { success: true, message: 'Đăng nhập thành công!' };
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
    refreshUsers,
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