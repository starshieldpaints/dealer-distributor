import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

export const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 12_000
});

let refreshPromise: Promise<string | null> | null = null;

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const response = error.response;
    const originalRequest = error.config as (AxiosRequestConfig & {
      _retry?: boolean;
    });

    if (response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = useAuthStore
            .getState()
            .refreshSession()
            .finally(() => {
              refreshPromise = null;
            });
        }
        const newToken = await refreshPromise;
        if (newToken) {
          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        }
      } catch {
        useAuthStore.getState().logout();
      }
    }

    const errorPayload = (response?.data ?? {}) as { message?: string };
    const message = errorPayload.message ?? error.message;
    if (response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(new Error(message));
  }
);
