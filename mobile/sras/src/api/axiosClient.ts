import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getBaseUrl = () => {
    // 1. Tự động lấy IP máy tính từ Expo Host URI khi chạy Expo Go (kết nối trực tiếp Backend cổng 8080)
    const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
    if (hostUri) {
        const ip = hostUri.split(':')[0];
        if (ip) {
            return `http://${ip}:8080/api`;
        }
    }

    // 2. Fallback sang IP LAN máy tính cổng Backend 8080
    return 'http://192.168.50.159:8080/api';
};

const BASE_URL = getBaseUrl();
console.log(`📡 [API Config] Backend BASE_URL: ${BASE_URL}`);

const axiosClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
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
    console.log(`🔑 [Auth Token] Token cập nhật: ${token ? `${token.substring(0, 15)}...` : 'null'}`);
};

axiosClient.interceptors.request.use(
    (config) => {
        if (currentAccessToken && config.headers) {
            config.headers.Authorization = `Bearer ${currentAccessToken}`;
        }
        console.log(`🌐 [API Request] [${config.method?.toUpperCase()}] ${config.baseURL}${config.url}`);
        if (config.data) {
            console.log(`📦 [API Payload]`, JSON.stringify(config.data, null, 2));
        }
        return config;
    },
    (error) => {
        console.error(`❌ [API Request Error]`, error);
        return Promise.reject(error);
    }
);

axiosClient.interceptors.response.use(
    (response) => {
        console.log(`✅ [API Success] [${response.config?.method?.toUpperCase()}] ${response.config?.url} (Status: ${response.status})`);
        return response.data;
    },
    async (error) => {
        const originalRequest = error.config;

        if (error.response) {
            console.error(`❌ [API Response Error] [${originalRequest?.method?.toUpperCase()}] ${originalRequest?.url} - Status: ${error.response.status}`);
            console.error(`📄 [Error Response Body]`, JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error(`⚠️ [Network Error] Không thể kết nối tới server: ${BASE_URL}`);
            console.error(`💡 Lưu ý: Nếu chạy app trên điện thoại thật bằng Expo Go, hãy đổi BASE_URL trong axiosClient.ts từ 10.0.2.2 sang IP mạng LAN máy tính (VD: http://192.168.x.x:8080/api)!`);
        } else {
            console.error(`❌ [Error Message]`, error.message);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
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
                console.log(`⚠️ [Auth] Không tìm thấy refreshToken để refresh, đăng xuất.`);
                setAccessToken(null);
                return Promise.reject(error);
            }

            try {
                console.log(`🔄 [Auth] Đang làm mới access token với refresh token...`);
                const { data } = await axios.post(`${BASE_URL}/auth/refresh`, null, {
                    params: { token: refreshToken }
                });

                const newAccessToken = data.data.accessToken;
                const newRefreshToken = data.data.refreshToken;

                setAccessToken(newAccessToken);
                await SecureStore.setItemAsync('refreshToken', newRefreshToken);

                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                processQueue(null, newAccessToken);
                console.log(`✅ [Auth] Làm mới token thành công!`);

                return axiosClient(originalRequest);
            } catch (err) {
                console.error(`❌ [Auth] Làm mới token thất bại!`, err);
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
