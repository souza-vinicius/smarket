"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api";
import { type LoginRequest, type RegisterRequest, type User } from "@/types";

const AUTH_KEYS = {
  user: ["user"] as const,
};

interface UseAuthReturn {
  user: User | null | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => void;
  register: (data: RegisterRequest) => void;
  logout: () => void;
  loginError: Error | null;
  registerError: Error | null;
  isLoginPending: boolean;
  isRegisterPending: boolean;
}

export function useAuth(): UseAuthReturn {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: user, isLoading } = useQuery({
    queryKey: AUTH_KEYS.user,
    queryFn: async () => {
      if (!apiClient.isAuthenticated()) {
        return null;
      }
      try {
        return await apiClient.getMe();
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => apiClient.login(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: AUTH_KEYS.user });
      router.push("/dashboard");
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => apiClient.register(data),
    onSuccess: () => {
      router.push("/login");
    },
  });

  const logout = (): void => {
    apiClient.logout();
    queryClient.clear();
    router.push("/login");
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    isLoginPending: loginMutation.isPending,
    isRegisterPending: registerMutation.isPending,
  };
}
