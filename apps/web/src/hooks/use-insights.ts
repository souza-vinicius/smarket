"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";

import { DASHBOARD_KEYS } from "@/hooks/use-dashboard";
import { apiClient } from "@/lib/api";
import { type Analysis } from "@/types";

const INSIGHT_KEYS = {
  all: ["insights"] as const,
  lists: () => [...INSIGHT_KEYS.all, "list"] as const,
  list: (filters: { type?: string; priority?: string; is_read?: boolean }) =>
    [...INSIGHT_KEYS.lists(), filters] as const,
  details: () => [...INSIGHT_KEYS.all, "detail"] as const,
  detail: (id: string) => [...INSIGHT_KEYS.details(), id] as const,
};

interface InsightsFilters {
  type?: string;
  priority?: string;
  is_read?: boolean;
  skip?: number;
  limit?: number;
}

export function useInsights(filters: InsightsFilters = {}): UseQueryResult<Analysis[]> {
  const { type, priority, is_read, skip = 0, limit = 100 } = filters;

  return useQuery({
    queryKey: INSIGHT_KEYS.list({ type, priority, is_read }),
    queryFn: async () => {
      const params: Record<string, string> = {
        skip: String(skip),
        limit: String(limit),
      };

      if (type) {
        params.type = type;
      }
      if (priority) {
        params.priority = priority;
      }
      if (is_read !== undefined) {
        params.is_read = String(is_read);
      }

      return apiClient.get<Analysis[]>("/analysis", params);
    },
  });
}

export function useInsight(id: string): UseQueryResult<Analysis> {
  return useQuery({
    queryKey: INSIGHT_KEYS.detail(id),
    queryFn: async () => {
      return apiClient.get<Analysis>(`/analysis/${id}`);
    },
    enabled: !!id,
  });
}

export function useMarkInsightAsRead(): UseMutationResult<Analysis, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient.post<Analysis>(`/analysis/${id}/read`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INSIGHT_KEYS.lists() });
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_KEYS.summary });
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_KEYS.insights });
    },
  });
}

export function useDismissInsight(): UseMutationResult<Analysis, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient.post<Analysis>(`/analysis/${id}/dismiss`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INSIGHT_KEYS.lists() });
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_KEYS.summary });
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_KEYS.insights });
    },
  });
}
