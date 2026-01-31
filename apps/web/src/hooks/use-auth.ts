'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { LoginRequest, RegisterRequest, User } from '@/types';

const AUTH_KEYS = {
  user: ['user'] as const,
};

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: user, isLoading } = useQuery({
    queryKey: AUTH_KEYS.user,
    queryFn: async () => {
      // For now, we'll check if there's a token
      // In a real app, you might want to validate the token with the server
      if (!apiClient.isAuthenticated()) {
        return null;
      }
      // Return a placeholder user - in production, fetch from /me endpoint
      return { id: '1', email: 'user@example.com', full_name: 'User' } as User;
    },
    staleTime: Infinity,
  });

  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => apiClient.login(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.user });
      router.push('/dashboard');
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => apiClient.register(data),
    onSuccess: () => {
      router.push('/login');
    },
  });

  const logout = () => {
    apiClient.logout();
    queryClient.clear();
    router.push('/login');
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
