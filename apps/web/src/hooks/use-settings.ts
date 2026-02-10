"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

interface Settings {
  id: string;
  email: string;
  full_name: string;
  household_income?: number;
  adults_count?: number;
  children_count?: number;
  created_at: string;
  updated_at: string;
}

interface SettingsUpdate {
  full_name?: string;
  household_income?: number;
  adults_count?: number;
  children_count?: number;
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await apiClient.get<Settings>("/users/profile");
      return response;
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SettingsUpdate) => {
      const response = await apiClient.patch<Settings>("/users/profile", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}
