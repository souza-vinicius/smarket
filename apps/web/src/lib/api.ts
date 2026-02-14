import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

import {
  type Token,
  type LoginRequest,
  type RegisterRequest,
  type User,
  type UserProfile,
  type UserProfileUpdate,
} from "@/types";

const API_BASE_URL = `${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "").replace(/\/api\/v1$/, "")  }/api/v1`;

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: Error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as RetryableRequest | undefined;

        if (!originalRequest) {
          return Promise.reject(error);
        }

        // If 401 and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshAccessToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            this.logout();
            // Dispatch unauthorized event instead of forcing reload
            window.dispatchEvent(new Event("auth:unauthorized"));
            return Promise.reject(
              refreshError instanceof Error ? refreshError : new Error(String(refreshError))
            );
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private getAccessToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access_token");
    }
    return null;
  }

  private getRefreshToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("refresh_token");
    }
    return null;
  }

  private async refreshAccessToken(): Promise<string> {
    // If there's already a refresh in progress, wait for it
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        const response = await axios.post<Token>(
          `${API_BASE_URL}/auth/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          }
        );

        const { access_token, refresh_token } = response.data;
        localStorage.setItem("access_token", access_token);
        localStorage.setItem("refresh_token", refresh_token);

        return access_token;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // Auth methods
  async login(data: LoginRequest): Promise<Token> {
    const response = await this.client.post<Token>("/auth/login", data);
    const { access_token, refresh_token } = response.data;
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("refresh_token", refresh_token);
    return response.data;
  }

  async register(data: RegisterRequest): Promise<User> {
    const response = await this.client.post<User>("/auth/register", data);
    return response.data;
  }

  logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  async getMe(): Promise<User> {
    const response = await this.client.get<User>("/auth/me");
    return response.data;
  }

  async changePassword(data: { current_password: string; new_password: string }): Promise<void> {
    await this.client.post("/auth/change-password", data);
  }

  // Profile methods
  async getProfile(): Promise<UserProfile> {
    const response = await this.client.get<UserProfile>("/users/profile");
    return response.data;
  }

  async updateProfile(data: UserProfileUpdate): Promise<UserProfile> {
    const response = await this.client.patch<UserProfile>("/users/profile", data);
    return response.data;
  }

  // Generic HTTP methods
  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.client.get<T>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.put<T>(url, data);
    return response.data;
  }

  async patch<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.patch<T>(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }

  // File upload method
  async uploadFile<T>(url: string, file: File, fieldName = "file"): Promise<T> {
    const formData = new FormData();
    formData.append(fieldName, file);

    const response = await this.client.post<T>(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }

  // Multiple files upload method
  async uploadFiles<T>(url: string, files: File[], fieldName = "files"): Promise<T> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append(fieldName, file);
    });

    const response = await this.client.post<T>(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }
}

export const apiClient = new ApiClient();
