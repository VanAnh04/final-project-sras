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
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    // Restore session from localStorage on load
    const storedToken = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const decoded = jwtDecode(storedToken);
        const currentTime = Date.now() / 1000;
        
        if (decoded.exp && decoded.exp > currentTime) {
          setAccessToken(storedToken);
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);
        } else {
          // Token expired, wait for axios interceptor to refresh it or clear it
          // We can clear it initially, and let the interceptor handle fetching a new one
          // Or we let the user stay logged in if there's a refresh token
          const refreshToken = Cookies.get('refreshToken');
          if (refreshToken) {
              setAccessToken(storedToken); // interceptor will refresh on next request
              setUser(JSON.parse(storedUser));
              setIsAuthenticated(true);
          } else {
              logout();
          }
        }
      } catch (e) {
        logout();
      }
    }
  }, []);

  const login = (token: string, refreshToken: string, userData: User) => {
    setAccessToken(token);
    setUser(userData);
    setIsAuthenticated(true);
    
    localStorage.setItem('accessToken', token);
    localStorage.setItem('user', JSON.stringify(userData));
    Cookies.set('refreshToken', refreshToken, { expires: 7 }); // 7 days
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
    <AuthContext.Provider value={{ user, accessToken, isAuthenticated, login, logout }}>
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
