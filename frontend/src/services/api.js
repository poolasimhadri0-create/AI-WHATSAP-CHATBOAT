import axios from 'axios';
import { tokenStorage } from '../utils/tokenStorage';
export function getBackendBaseUrl() {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  const storedUrl = (typeof window !== 'undefined' ? localStorage.getItem('VITE_API_URL') || '' : '').trim();
  const rawUrl = envUrl || storedUrl;
  const cleanUrl = rawUrl.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
  return cleanUrl ? `${cleanUrl}/api/v1` : '/api/v1';
}

const api = axios.create({
  baseURL: getBackendBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 90000,
});

// ── Request interceptor: attach access token ─────────────────
api.interceptors.request.use(
  (config) => {
    config.baseURL = getBackendBaseUrl();
    const token = tokenStorage.getAccess();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 with refresh ────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      tokenStorage.getRefresh()
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = tokenStorage.getRefresh();
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        const newAccess = data.access_token;
        tokenStorage.setTokens(newAccess, refreshToken);
        api.defaults.headers.common.Authorization = `Bearer ${newAccess}`;
        processQueue(null, newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        tokenStorage.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
