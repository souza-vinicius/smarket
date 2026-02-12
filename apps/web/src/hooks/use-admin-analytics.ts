"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import type {
  DashboardStats,
  RevenueChartData,
  GrowthChartData,
  OperationalMetrics,
} from "@/types/admin";

const ADMIN_ANALYTICS_KEYS = {
  all: ["admin", "analytics"] as const,
  stats: () => [...ADMIN_ANALYTICS_KEYS.all, "stats"] as const,
  revenue: (months: number) =>
    [...ADMIN_ANALYTICS_KEYS.all, "revenue", months] as const,
  growth: (months: number) =>
    [...ADMIN_ANALYTICS_KEYS.all, "growth", months] as const,
  operations: () => [...ADMIN_ANALYTICS_KEYS.all, "operations"] as const,
};

interface UseAdminDashboardStatsReturn {
  stats: DashboardStats | null;
  isLoading: boolean;
  error: Error | null;
}

export function useAdminDashboardStats(): UseAdminDashboardStatsReturn {
  const { data, isLoading, error } = useQuery({
    queryKey: ADMIN_ANALYTICS_KEYS.stats(),
    queryFn: async () => {
      const response = await adminApi.get<DashboardStats>("/dashboard/stats");
      return response.data;
    },
  });

  return {
    stats: data || null,
    isLoading,
    error: error as Error | null,
  };
}

interface UseAdminRevenueChartReturn {
  data: RevenueChartData[];
  isLoading: boolean;
  error: Error | null;
}

export function useAdminRevenueChart(
  months: number = 12
): UseAdminRevenueChartReturn {
  const { data, isLoading, error } = useQuery({
    queryKey: ADMIN_ANALYTICS_KEYS.revenue(months),
    queryFn: async () => {
      const response = await adminApi.get<RevenueChartData[]>(
        `/dashboard/revenue?months=${months}`
      );
      return response.data;
    },
  });

  return {
    data: data || [],
    isLoading,
    error: error as Error | null,
  };
}

interface UseAdminGrowthChartReturn {
  data: GrowthChartData[];
  isLoading: boolean;
  error: Error | null;
}

export function useAdminGrowthChart(
  months: number = 12
): UseAdminGrowthChartReturn {
  const { data, isLoading, error } = useQuery({
    queryKey: ADMIN_ANALYTICS_KEYS.growth(months),
    queryFn: async () => {
      const response = await adminApi.get<GrowthChartData[]>(
        `/dashboard/growth?months=${months}`
      );
      return response.data;
    },
  });

  return {
    data: data || [],
    isLoading,
    error: error as Error | null,
  };
}

interface UseAdminOperationalMetricsReturn {
  metrics: OperationalMetrics | null;
  isLoading: boolean;
  error: Error | null;
}

export function useAdminOperationalMetrics(): UseAdminOperationalMetricsReturn {
  const { data, isLoading, error } = useQuery({
    queryKey: ADMIN_ANALYTICS_KEYS.operations(),
    queryFn: async () => {
      const response = await adminApi.get<OperationalMetrics>(
        "/dashboard/operations"
      );
      return response.data;
    },
  });

  return {
    metrics: data || null,
    isLoading,
    error: error as Error | null,
  };
}
