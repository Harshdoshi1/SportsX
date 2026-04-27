import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AdminSession {
  email: string;
  isAdmin: boolean;
  loginTime: string;
  expiresAt: string;
}

interface AdminContextType {
  isAdmin: boolean;
  session: AdminSession | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'Harshdoshi1$';
const SESSION_KEY = 'admin_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function AdminProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null);

  useEffect(() => {
    // Load session from localStorage on mount
    const storedSession = localStorage.getItem(SESSION_KEY);
    if (storedSession) {
      try {
        const parsed: AdminSession = JSON.parse(storedSession);
        const now = new Date().getTime();
        const expiresAt = new Date(parsed.expiresAt).getTime();
        
        if (now < expiresAt) {
          setSession(parsed);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      } catch (error) {
        console.error('Failed to parse admin session:', error);
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + SESSION_DURATION);
      
      const newSession: AdminSession = {
        email,
        isAdmin: true,
        loginTime: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };
      
      setSession(newSession);
      localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
      return true;
    }
    return false;
  };

  const logout = () => {
    setSession(null);
    localStorage.removeItem(SESSION_KEY);
  };

  return (
    <AdminContext.Provider value={{ isAdmin: !!session, session, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
