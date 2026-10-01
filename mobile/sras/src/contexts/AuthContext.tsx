import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { setAccessToken, BASE_URL } from '../api/axiosClient';
import { chatSocket } from '../realtime/chatSocket';
import Constants from 'expo-constants';
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
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const storedUser = await SecureStore.getItemAsync('user');
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {}
        }

        if (refreshToken) {
          try {
            const { data } = await axios.post(`${BASE_URL}/auth/refresh`, null, {
              params: { token: refreshToken },
              timeout: 10000,
            });
            const authData = data?.data || data;

            if (authData?.accessToken && isMounted) {
              setAccessToken(authData.accessToken);
              if (authData.refreshToken) {
                await SecureStore.setItemAsync('refreshToken', authData.refreshToken);
              }
              const currentUser = authData.user || (storedUser ? JSON.parse(storedUser) : null);
              setUser(currentUser);
              if (currentUser) {
                await SecureStore.setItemAsync('user', JSON.stringify(currentUser));
              }
              setIsAuthenticated(true);
            }
          } catch (refreshErr: any) {
            // Chỉ xóa session nếu Backend trả về 401/403 (token bị thu hồi hoặc hết hạn thực sự)
            if (refreshErr?.response?.status === 401 || refreshErr?.response?.status === 403) {
              await SecureStore.deleteItemAsync('user');
              await SecureStore.deleteItemAsync('refreshToken');
              setAccessToken(null);
              setUser(null);
              setIsAuthenticated(false);
            } else if (storedUser) {
              // Nếu lỗi mạng tạm thời nhưng có storedUser, giữ trạng thái đăng nhập
              setIsAuthenticated(true);
            }
          }
        } else {
          setAccessToken(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        setAccessToken(null);
        setUser(null);
        setIsAuthenticated(false);
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

  // Bật/tắt WebSocket chat realtime theo trạng thái đăng nhập.
  useEffect(() => {
    if (isAuthenticated && user?.id != null) {
      chatSocket.connect(user.id);
    } else {
      chatSocket.disconnect();
    }
  }, [isAuthenticated, user?.id]);

  const login = async (token: string, refreshToken: string, userData: User) => {
    setAccessToken(token);
    setUser(userData);
    setIsAuthenticated(true);
    
    await SecureStore.setItemAsync('user', JSON.stringify(userData));
    if (refreshToken) {
      await SecureStore.setItemAsync('refreshToken', refreshToken);
    }
  };

  const logout = async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (refreshToken) {
        await axios.post(
          `${BASE_URL}/auth/logout`,
          { refreshToken, token: refreshToken },
          {
            headers: { 'Content-Type': 'application/json' },
            params: { token: refreshToken }
          }
        );
      }
    } catch (e) {
      // Ignore network errors during logout
    }

    setAccessToken(null);
    setUser(null);
    setIsAuthenticated(false);
    
    await SecureStore.deleteItemAsync('user');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('accessToken');
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


