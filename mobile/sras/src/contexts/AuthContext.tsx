import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import { setAccessToken } from '../api/axiosClient';
import { useRouter } from 'expo-router';

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
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedUser = await SecureStore.getItemAsync('user');
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        
        if (storedUser && refreshToken) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
        } else {
          await logout();
        }
      } catch (error) {
        await logout();
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (token: string, refreshToken: string, userData: User) => {
    setAccessToken(token);
    setUser(userData);
    setIsAuthenticated(true);
    
    await SecureStore.setItemAsync('user', JSON.stringify(userData));
    await SecureStore.setItemAsync('refreshToken', refreshToken);
  };

  const logout = async () => {
    setAccessToken(null);
    setUser(null);
    setIsAuthenticated(false);
    
    await SecureStore.deleteItemAsync('user');
    await SecureStore.deleteItemAsync('refreshToken');
    router.replace('/');
  };

  const updateUser = async (updatedData: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updatedData };
    setUser(updated);
    await SecureStore.setItemAsync('user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, updateUser }}>
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

