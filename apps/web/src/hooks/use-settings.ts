'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { UserProfile, UserProfileUpdate } from '@/types';

const SETTINGS_KEYS = {
  profile: ['settings', 'profile'] as const,
};

export function useProfile() {
  return useQuery({
    queryKey: SETTINGS_KEYS.profile,
    queryFn: async (): Promise<UserProfile> => {
      return apiClient.getProfile();
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UserProfileUpdate): Promise<UserProfile> => {
      return apiClient.updateProfile(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEYS.profile });
    },
  });
}
