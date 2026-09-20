import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axiosClient, { setAccessToken as setAccessTokenClient } from '../api/axiosClient';

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
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to safely restore cached user info from localStorage for UI display
const getCachedUser = (): User | null => {
  try {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(getCachedUser);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore session when opening/reloading web app
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        // Call refresh endpoint with httpOnly cookie sent automatically by browser
        const response: any = await axiosClient.post('/auth/refresh');
        const authData = response?.data || response;

        if (authData?.accessToken && authData?.user && isMounted) {
          setAccessTokenClient(authData.accessToken);
          setAccessToken(authData.accessToken);
          setUser(authData.user);
          setIsAuthenticated(true);
          localStorage.setItem('user', JSON.stringify(authData.user));
        } else if (isMounted) {
          setIsAuthenticated(false);
          setUser(null);
          setAccessToken(null);
          setAccessTokenClient(null);
          localStorage.removeItem('user');
        }
      } catch (error) {
        if (isMounted) {
          setAccessTokenClient(null);
          setAccessToken(null);
          setUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem('user');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback((token: string, _refreshToken: string, userData: User) => {
    setAccessTokenClient(token);
    setAccessToken(token);
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData));
  }, []);

  const logout = useCallback(async () => {
    try {
      await axiosClient.post('/auth/logout');
    } catch (err) {
      // Ignore network errors during logout
    } finally {
      setAccessTokenClient(null);
      setAccessToken(null);
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('user');
    }
  }, []);

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

