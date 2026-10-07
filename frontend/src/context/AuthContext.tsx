import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../api/client';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, totp_code?: string) => Promise<void>;
  register: (email: string, password: string, full_name?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const { data } = await authApi.me();
      setUser(data);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string, totp_code?: string) => {
    const { data } = await authApi.login({ email, password, totp_code });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    await refreshUser();
  };

  const register = async (email: string, password: string, full_name?: string) => {
    await authApi.register({ email, password, full_name });
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
