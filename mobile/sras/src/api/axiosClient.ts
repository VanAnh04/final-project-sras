import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const getBaseUrl = (): string => {
    // 1. Ưu tiên biến môi trường EXPO_PUBLIC_API_URL nếu được định nghĩa (.env)
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
    }

    // 2. Tự động lấy IP máy tính đang chạy Metro Bundler khi dùng Expo Go trên thiết bị thật
    const hostUri =
        Constants.expoConfig?.hostUri ||
        Constants.manifest?.debuggerHost ||
        (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
        (Constants as any).linkingUri?.replace(/^(https?|exp):\/\//, '').split('/')[0];

    if (hostUri) {
        const ip = hostUri.split(':')[0];
        if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
            return `http://${ip}:8080/api`;
        }
    }

    // 3. Android Emulator: 10.0.2.2 là gateway chuẩn trỏ về localhost của máy tính
    if (Platform.OS === 'android') {
        return 'http://10.0.2.2:8080/api';
    }

    // 4. iOS Simulator hoặc Web: localhost
    return 'http://localhost:8080/api';
};

export const BASE_URL = getBaseUrl();

const axiosClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000,
});

let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

let currentAccessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
    currentAccessToken = token;
};

axiosClient.interceptors.request.use(
    (config) => {
        if (currentAccessToken && config.headers) {
            config.headers.Authorization = `Bearer ${currentAccessToken}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

axiosClient.interceptors.response.use(
    (response) => {
        return response.data;
    },
    async (error) => {
        const originalRequest = error.config;
        if (!originalRequest) {
            return Promise.reject(error);
        }

        // Bỏ qua tất cả các endpoint auth (login, register, refresh, verify-otp...)
        // Không được phép trigger refresh token interceptor khi các endpoint này trả về 401/403
        const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
                               originalRequest.url?.includes('/auth/register') ||
                               originalRequest.url?.includes('/auth/refresh') ||
                               originalRequest.url?.includes('/auth/verify-otp') ||
                               originalRequest.url?.includes('/auth/resend-otp') ||
                               originalRequest.url?.includes('/auth/clerk') ||
                               originalRequest.url?.includes('/auth/google') ||
                               originalRequest.url?.includes('/auth/forgot-password');

        if (isAuthEndpoint) {
            return Promise.reject(error);
        }

        if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = 'Bearer ' + token;
                        return axiosClient(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = await SecureStore.getItemAsync('refreshToken');

                if (!refreshToken) {
                    setAccessToken(null);
                    processQueue(error, null);
                    return Promise.reject(error);
                }

                const { data } = await axios.post(`${BASE_URL}/auth/refresh`, null, {
                    params: { token: refreshToken },
                    timeout: 10000,
                });

                const newAccessToken = data.data.accessToken;
                const newRefreshToken = data.data.refreshToken;

                setAccessToken(newAccessToken);
                if (newRefreshToken) {
                    await SecureStore.setItemAsync('refreshToken', newRefreshToken);
                }

                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                processQueue(null, newAccessToken);

                return axiosClient(originalRequest);
            } catch (err) {
                processQueue(err, null);
                setAccessToken(null);
                await SecureStore.deleteItemAsync('refreshToken').catch(() => {});
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default axiosClient;
