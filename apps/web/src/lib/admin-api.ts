/**
 * Admin API client with platform header and error handling.
 *
 * Adds X-Platform header to all requests for backend platform validation.
 * Layer 4 of 4-layer defense (backend checks this header and rejects iOS/Android).
 */

import axios, { AxiosError } from "axios";
import { getPlatform } from "./capacitor";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const adminApi = axios.create({
  baseURL: `${API_URL}/api/v1/admin`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Add auth token and platform header
adminApi.interceptors.request.use(
  (config) => {
    // Add JWT token
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add platform header (backend will reject ios/android)
    config.headers["X-Platform"] = getPlatform();

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle 401/403 errors
adminApi.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Unauthorized - token expired or invalid
      console.error("[Admin API] Unauthorized:", error.response.data);

      // Clear tokens and redirect to login
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
      }
    }

    if (error.response?.status === 403) {
      // Forbidden - either not admin or native platform blocked
      console.error("[Admin API] Access forbidden:", error.response.data);

      // Redirect to dashboard (handled by component with toast)
      if (typeof window !== "undefined") {
        window.location.href = "/dashboard";
      }
    }

    return Promise.reject(error);
  }
);

export default adminApi;
