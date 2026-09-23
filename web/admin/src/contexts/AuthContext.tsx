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
  login: (accessToken: string, refreshToken: string, user: User, rememberMe?: boolean) => void;
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

  const clearAuthState = useCallback(() => {
    setAccessTokenClient(null);
    setAccessToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('refreshToken');
  }, []);

  // Restore session when opening/reloading web app
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        // Tìm refresh token trong localStorage (nếu có nhớ đăng nhập) hoặc sessionStorage
        const storedRefreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');

        // Gửi POST /auth/refresh kèm refreshToken trong body (nếu có) và cookie tự động của browser
        const payload = storedRefreshToken ? { refreshToken: storedRefreshToken } : {};
        const response: any = await axiosClient.post('/auth/refresh', payload);
        const authData = response?.data || response;

        if (authData?.accessToken && authData?.user && isMounted) {
          setAccessTokenClient(authData.accessToken);
          setAccessToken(authData.accessToken);
          setUser(authData.user);
          setIsAuthenticated(true);
          localStorage.setItem('user', JSON.stringify(authData.user));

          // Cập nhật lại refreshToken mới xoay vòng
          if (authData.refreshToken) {
            if (localStorage.getItem('refreshToken')) {
              localStorage.setItem('refreshToken', authData.refreshToken);
            } else if (sessionStorage.getItem('refreshToken')) {
              sessionStorage.setItem('refreshToken', authData.refreshToken);
            }
          }
        } else if (isMounted) {
          clearAuthState();
        }
      } catch (error) {
        if (isMounted) {
          clearAuthState();
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
  }, [clearAuthState]);

  const login = useCallback((token: string, refreshToken: string, userData: User, rememberMe: boolean = true) => {
    setAccessTokenClient(token);
    setAccessToken(token);
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData));

    if (refreshToken) {
      if (rememberMe) {
        localStorage.setItem('refreshToken', refreshToken);
        sessionStorage.removeItem('refreshToken');
      } else {
        sessionStorage.setItem('refreshToken', refreshToken);
        localStorage.removeItem('refreshToken');
      }
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const storedRefreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
      await axiosClient.post('/auth/logout', storedRefreshToken ? { refreshToken: storedRefreshToken } : {});
    } catch (err) {
      // Ignore network errors during logout
    } finally {
      clearAuthState();
    }
  }, [clearAuthState]);

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
