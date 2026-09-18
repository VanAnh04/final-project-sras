import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import Cookies from 'js-cookie';

interface User {
  id: number;
  fullName: string;
  phone: string;
  email: string;
  avatarUrl: string;
  role: string;
  isPhoneVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to safely restore user from localStorage
const getInitialUser = (): User | null => {
  try {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
};

// Helper to safely restore token from localStorage
const getInitialToken = (): string | null => {
  return localStorage.getItem('accessToken');
};

// Helper to determine initial auth state synchronously on page load
const getInitialAuthStatus = (): boolean => {
  const token = localStorage.getItem('accessToken');
  const storedUser = localStorage.getItem('user');
  if (!token || !storedUser) return false;

  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const decoded = jwtDecode<{ exp?: number }>(token);
      const currentTime = Date.now() / 1000;
      if (decoded.exp && decoded.exp <= currentTime) {
        const refreshToken = Cookies.get('refreshToken');
        // If expired and no refresh token, return false
        if (!refreshToken) return false;
      }
    }
    return true;
  } catch {
    // In case token is not standard JWT (e.g. dev mock token), treat as authenticated if present
    return true;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(getInitialUser);
  const [accessToken, setAccessToken] = useState<string | null>(getInitialToken);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(getInitialAuthStatus);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Restore session from localStorage on load & validate
    const storedToken = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const parts = storedToken.split('.');
        if (parts.length === 3) {
          const decoded = jwtDecode<{ exp?: number }>(storedToken);
          const currentTime = Date.now() / 1000;

          if (decoded.exp && decoded.exp <= currentTime) {
            const refreshToken = Cookies.get('refreshToken');
            if (!refreshToken) {
              logout();
            } else {
              setAccessToken(storedToken);
              setUser(JSON.parse(storedUser));
              setIsAuthenticated(true);
            }
          } else {
            setAccessToken(storedToken);
            setUser(JSON.parse(storedUser));
            setIsAuthenticated(true);
          }
        } else {
          // Dev/Mock token case
          setAccessToken(storedToken);
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);
        }
      } catch {
        // Fallback: keep user logged in if token and user exist in dev
        setAccessToken(storedToken);
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      }
    } else {
      setIsAuthenticated(false);
    }
    setIsLoading(false);
  }, []);

  const login = (token: string, refreshToken: string, userData: User) => {
    setAccessToken(token);
    setUser(userData);
    setIsAuthenticated(true);
    
    localStorage.setItem('accessToken', token);
    localStorage.setItem('user', JSON.stringify(userData));
    if (refreshToken) {
      Cookies.set('refreshToken', refreshToken, { expires: 7 }); // 7 days
    }
  };

  const logout = () => {
    setAccessToken(null);
    setUser(null);
    setIsAuthenticated(false);
    
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    Cookies.remove('refreshToken');
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
