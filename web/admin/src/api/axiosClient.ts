import axios from 'axios';
import Cookies from 'js-cookie';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const axiosClient = axios.create({
    baseURL: BASE_URL,
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
        // In web, access token is typically stored in memory via AuthContext, 
        // but for simplicity across reloads, we can store it in localStorage or handle it globally.
        const token = localStorage.getItem('accessToken');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
    (response) => response.data,
    async (error) => {
        const originalRequest = error.config;

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

            const refreshToken = Cookies.get('refreshToken');
            
            if (!refreshToken) {
                // No refresh token, force logout
                localStorage.removeItem('accessToken');
                localStorage.removeItem('user');
                window.location.href = '/login';
                return Promise.reject(error);
            }

            try {
                // Call refresh endpoint directly using raw axios to avoid infinite loop
                const { data } = await axios.post(`${BASE_URL}/auth/refresh`, null, {
                    params: { token: refreshToken }
                });

                const newAccessToken = data.data.accessToken;
                const newRefreshToken = data.data.refreshToken;

                localStorage.setItem('accessToken', newAccessToken);
                Cookies.set('refreshToken', newRefreshToken, { expires: 7 }); // 7 days

                axiosClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                processQueue(null, newAccessToken);

                return axiosClient(originalRequest);
            } catch (err) {
                processQueue(err, null);
                localStorage.removeItem('accessToken');
                localStorage.removeItem('user');
                Cookies.remove('refreshToken');
                window.location.href = '/login';
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default axiosClient;
