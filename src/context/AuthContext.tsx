import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types/crm';
import { db, api, authToken, revokeSession } from '../services/db';

interface AuthContextType {
  currentUser: User;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (role: UserRole, email: string, password?: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => void;
  users: User[];
  isAdmin: boolean;
  isTrainer: boolean;
  isStudent: boolean;
  // Permissions
  canEditPayments: boolean;
  canCreateManualInstallment: boolean;
  canApproveLeave: boolean;
  canManageCourses: boolean;
  canOnboardStudents: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Placeholder used only while nobody is signed in (never shown in the UI)
const EMPTY_USER: User = {
  id: '',
  name: '',
  email: '',
  phone: '',
  role: 'admin',
  status: 'active',
  created_at: new Date().toISOString()
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    revokeSession(); // fire & forget: invalidates the refresh token on the server
    authToken.clear();
    db.clear();
    setUser(null);
  }, []);

  // Restore session from the saved token
  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      if (!authToken.hasSession()) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await api<{ user: User }>('GET', '/api/auth/me');
        await db.load();
        if (!cancelled) setUser(me.user);
      } catch {
        authToken.clear();
        db.clear();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    restore();
    return () => { cancelled = true; };
  }, []);

  // Token expired / rejected by the server -> back to login page
  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener('srikara:unauthorized', onUnauthorized);
    return () => window.removeEventListener('srikara:unauthorized', onUnauthorized);
  }, [logout]);

  const login = async (
    role: UserRole,
    email: string,
    password?: string
  ): Promise<{ success: boolean; user?: User; error?: string }> => {
    try {
      const res = await api<{ accessToken: string; refreshToken: string; user: User }>('POST', '/api/auth/login', {
        role,
        email: email.trim(),
        password: password || ''
      });
      authToken.set(res.accessToken, res.refreshToken);
      await db.load();
      setUser(res.user);
      return { success: true, user: res.user };
    } catch (err: any) {
      authToken.clear();
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const currentUser = user || EMPTY_USER;
  const isAuthenticated = !!user;

  const isAdmin = currentUser.role === 'admin';
  const isTrainer = currentUser.role === 'trainer';
  const isStudent = currentUser.role === 'student';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isLoading,
        login,
        logout,
        users: user ? [user] : [],
        isAdmin,
        isTrainer,
        isStudent,
        canEditPayments: isAdmin,
        canCreateManualInstallment: isAdmin,
        canApproveLeave: isAdmin,
        canManageCourses: isAdmin,
        canOnboardStudents: isAdmin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
