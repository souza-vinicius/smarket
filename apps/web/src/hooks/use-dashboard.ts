"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { apiClient } from "@/lib/api";
import { type DashboardSummary, type Analysis } from "@/types";

export const DASHBOARD_KEYS = {
  summary: ["dashboard", "summary"] as const,
  insights: ["dashboard", "insights"] as const,
};

export function useDashboardSummary(): UseQueryResult<DashboardSummary> {
  return useQuery({
    queryKey: DASHBOARD_KEYS.summary,
    queryFn: async () => {
      return apiClient.get<DashboardSummary>("/analysis/dashboard/summary");
    },
  });
}

export function useRecentInsights(limit = 6): UseQueryResult<Analysis[]> {
  return useQuery({
    queryKey: [...DASHBOARD_KEYS.insights, limit],
    queryFn: async () => {
      return apiClient.get<Analysis[]>("/analysis", { limit: String(limit), skip: "0" });
    },
  });
}
