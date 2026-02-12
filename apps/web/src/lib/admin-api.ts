/**
 * Admin API client with platform header, token refresh, and error handling.
 *
 * Adds X-Platform header to all requests for backend platform validation.
 * Layer 4 of 4-layer defense (backend checks this header and rejects iOS/Android).
 */

import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { getPlatform } from "./capacitor";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_BASE_URL = `${API_URL.replace(/\/$/, "").replace(/\/api\/v1$/, "")}/api/v1`;

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await axios.post<{ access_token: string; refresh_token: string }>(
        `${API_BASE_URL}/auth/refresh`,
        {},
        { headers: { Authorization: `Bearer ${refreshToken}` } }
      );

      const { access_token, refresh_token } = response.data;
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);

      return access_token;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export const adminApi = axios.create({
  baseURL: `${API_URL}/api/v1/admin`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Add auth token and platform header
adminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    config.headers["X-Platform"] = getPlatform();

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle 401/403 with token refresh
adminApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequest | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // 401: try token refresh before giving up
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return adminApi(originalRequest);
      } catch {
        // Refresh failed — clear tokens and redirect to login
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    }

    if (error.response?.status === 403) {
      console.error("[Admin API] Access forbidden:", error.response.data);

      if (typeof window !== "undefined") {
        window.location.href = "/dashboard";
      }
    }

    return Promise.reject(error);
  }
);

export default adminApi;
