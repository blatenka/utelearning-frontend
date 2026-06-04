import axios, { AxiosError, AxiosResponse } from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

let isRefreshing = false;

let failedQueue: Array<{
  onSuccess: (token: string) => void;
  onFailed: (err: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.onFailed(error);
    } else if (token) {
      prom.onSuccess(token);
    }
  });

  failedQueue = [];
};

const isAuthEndpoint = (url?: string) => {
  if (!url) return false;

  return (
    url.includes("/v1/auth/login") ||
    url.includes("/v1/auth/register") ||
    url.includes("/v1/auth/refresh") ||
    url.includes("/v1/auth/logout")
  );
};

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url;

    if (status !== 401) {
      return Promise.reject(error);
    }

    if (isAuthEndpoint(requestUrl)) {
      return Promise.reject(error);
    }

    if (originalRequest?._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          onSuccess: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          },
          onFailed: (err: Error) => {
            reject(err);
          },
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshResponse = await axios.post(
        `${API_BASE_URL}/v1/auth/refresh`,
        {},
        {
          withCredentials: true,
        }
      );

      const newToken = refreshResponse.data.data.accessToken;

      localStorage.setItem("accessToken", newToken);

      originalRequest.headers.Authorization = `Bearer ${newToken}`;

      processQueue(null, newToken);

      return api(originalRequest);
    } catch (refreshError) {
      const normalizedError =
        refreshError instanceof Error
          ? refreshError
          : new Error("Token refresh failed");

      processQueue(normalizedError, null);

      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");

      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }

      return Promise.reject(normalizedError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;