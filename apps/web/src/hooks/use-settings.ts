"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";

import { apiClient } from "@/lib/api";
import { type UserProfile, type UserProfileUpdate } from "@/types";

const SETTINGS_KEYS = {
  profile: ["settings", "profile"] as const,
};

export function useProfile(): UseQueryResult<UserProfile> {
  return useQuery({
    queryKey: SETTINGS_KEYS.profile,
    queryFn: async (): Promise<UserProfile> => {
      return apiClient.getProfile();
    },
  });
}

export function useUpdateProfile(): UseMutationResult<UserProfile, Error, UserProfileUpdate> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UserProfileUpdate): Promise<UserProfile> => {
      return apiClient.updateProfile(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SETTINGS_KEYS.profile });
    },
  });
}
