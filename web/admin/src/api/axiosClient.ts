import axios from 'axios';

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
export const API_ORIGIN = BASE_URL.replace(/\/api\/?$/, '');

export const resolveFileUrl = (url?: string | null): string => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
    return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
};

let memoryAccessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
    memoryAccessToken = token;
};

export const getAccessToken = (): string | null => {
    return memoryAccessToken;
};

const axiosClient = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
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

axiosClient.interceptors.request.use(
    (config) => {
        if (memoryAccessToken && config.headers) {
            config.headers.Authorization = `Bearer ${memoryAccessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
    (response) => response.data,
    async (error) => {
        const originalRequest = error.config;
        const url = originalRequest?.url || '';
        const isAuthEndpoint =
            url.includes('/auth/login') ||
            url.includes('/auth/register') ||
            url.includes('/auth/refresh') ||
            url.includes('/auth/google');

        if (!isAuthEndpoint && error.response?.status === 401 && originalRequest && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        if (originalRequest.headers) {
                            originalRequest.headers.Authorization = 'Bearer ' + token;
                        }
                        return axiosClient(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Call refresh endpoint with credentials so browser sends httpOnly cookie, plus fallback body
                const storedRefreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
                const payload = storedRefreshToken ? { refreshToken: storedRefreshToken } : {};

                const { data } = await axios.post(
                    `${BASE_URL}/auth/refresh`,
                    payload,
                    { withCredentials: true }
                );

                const authData = data?.data || data;
                const newAccessToken = authData?.accessToken;

                if (!newAccessToken) {
                    throw new Error('Không nhận được Access Token mới');
                }

                setAccessToken(newAccessToken);

                if (authData.refreshToken) {
                    if (localStorage.getItem('refreshToken')) {
                        localStorage.setItem('refreshToken', authData.refreshToken);
                    } else if (sessionStorage.getItem('refreshToken')) {
                        sessionStorage.setItem('refreshToken', authData.refreshToken);
                    }
                }

                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                }

                processQueue(null, newAccessToken);

                return axiosClient(originalRequest);
            } catch (err) {
                processQueue(err, null);
                setAccessToken(null);

                // Clear cached user and tokens if refresh fails
                localStorage.removeItem('user');
                localStorage.removeItem('refreshToken');
                sessionStorage.removeItem('refreshToken');

                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default axiosClient;

