import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getBaseUrl = () => {
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }

    // Nếu chạy trên Web
    if (Platform.OS === 'web') {
        return 'http://localhost:8080/api';
    }

    // 1. Tự động lấy IP máy tính từ Expo Host URI khi chạy Expo Go (kết nối trực tiếp Backend cổng 8080)
    const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
    if (hostUri) {
        const ip = hostUri.split(':')[0];
        if (ip && ip !== 'localhost') {
            return `http://${ip}:8080/api`;
        }
        if (ip === 'localhost' && Platform.OS === 'android') {
            return 'http://10.0.2.2:8080/api';
        }
    }

    // 2. Fallback sang IP LAN máy tính cổng Backend 8080 (IP hiện tại: 192.168.1.5)
    return 'http://192.168.1.5:8080/api';
};

export const BASE_URL = getBaseUrl();

// Gốc server (bỏ hậu tố "/api"). File tĩnh như ảnh được phục vụ ở "/uploads/**" ngay tại root.
export const API_ORIGIN = BASE_URL.replace(/\/api\/?$/, '');

/**
 * Backend trả URL ảnh dạng tương đối ("/uploads/..") — <Image> không tải được.
 * Ghép về URL tuyệt đối; giữ nguyên nếu đã là http(s).
 */
export const resolveFileUrl = (url?: string | null): string | undefined => {
    if (!url) return undefined;
    if (/^https?:\/\//i.test(url)) return url;
    return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const getWsUrl = (path: string = '/ws/chat') => {
    const wsBase = BASE_URL.replace(/^http/, 'ws').replace(/\/api$/, '');
    return `${wsBase}${path}`;
};

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

export const getAccessToken = (): string | null => currentAccessToken;

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
        const url = originalRequest?.url || '';
        const isAuthEndpoint =
            url.includes('/auth/login') ||
            url.includes('/auth/register') ||
            url.includes('/auth/refresh') ||
            url.includes('/auth/clerk') ||
            url.includes('/auth/google') ||
            url.includes('/auth/verify-otp') ||
            url.includes('/auth/resend-otp') ||
            url.includes('/auth/forgot-password') ||
            url.includes('/auth/reset-password');

        if (!isAuthEndpoint && (error.response?.status === 401 || error.response?.status === 403) && originalRequest && !originalRequest._retry) {
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

            const refreshToken = await SecureStore.getItemAsync('refreshToken');

            if (!refreshToken) {
                setAccessToken(null);
                return Promise.reject(error);
            }

            try {
                const { data } = await axios.post(
                    `${BASE_URL}/auth/refresh`,
                    { refreshToken, token: refreshToken },
                    {
                        headers: { 'Content-Type': 'application/json' },
                        params: { token: refreshToken }
                    }
                );

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
                await SecureStore.deleteItemAsync('refreshToken');
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default axiosClient;
