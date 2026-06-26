import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  joinedAt: string;
  uploadedCount: number;
  cleanedCount: number;
  lastLogin: string;
  copilotChatHistory?: { role: 'user' | 'model'; parts: { text: string }[]; timestamp: string }[];
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  toasts: Toast[];
  login: (userData: User, token: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('datasage_token'));
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    const fetchMe = async () => {
      if (token) {
        try {
          const res = await api.getMe();
          setUser(res.user);
        } catch (error) {
          console.error("Auth session restore failed:", error);
          logout();
        }
      }
      setLoading(false);
    };
    fetchMe();
  }, [token]);

  const login = (userData: User, userToken: string) => {
    localStorage.setItem('datasage_token', userToken);
    setToken(userToken);
    setUser(userData);
    addToast(`Welcome back, ${userData.name}!`, 'success');
  };

  const logout = () => {
    localStorage.removeItem('datasage_token');
    setToken(null);
    setUser(null);
    addToast('Logged out successfully.', 'info');
  };

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      setUser(res.user);
    } catch (error) {
      console.error("Failed to refresh user profile data", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, toasts, login, logout, refreshUser, addToast, removeToast }}>
      {children}
      {/* Absolute Toast Overlay */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl shadow-lg border text-sm flex items-center justify-between backdrop-blur-md transition-all duration-300 animate-slide-in ${
              toast.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-rose-950/80 border-rose-500/30 text-rose-200'
                : toast.type === 'warning'
                ? 'bg-amber-950/80 border-amber-500/30 text-amber-200'
                : 'bg-slate-900/80 border-slate-700/30 text-slate-200'
            }`}
          >
            <span className="font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-3 text-current opacity-60 hover:opacity-100 font-bold"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
