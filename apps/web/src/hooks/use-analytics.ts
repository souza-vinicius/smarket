"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { apiClient } from "@/lib/api";

const ANALYTICS_KEYS = {
  spendingTrends: (months: number) => ["analytics", "spending-trends", months] as const,
  categorySpending: (months: number) => ["analytics", "category-spending", months] as const,
  merchantInsights: (limit: number) => ["analytics", "merchant-insights", limit] as const,
};

interface MonthlyTrend {
  month: string;
  total: number;
  invoice_count: number;
}

interface SpendingTrendsResponse {
  period_months: number;
  trends: MonthlyTrend[];
}

interface CategorySpending {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  total_spent: number;
}

interface SubcategorySpending extends CategorySpending {
  parent_id: string | null;
  parent_name: string;
}

interface CategorySpendingResponse {
  period_months: number;
  categories: CategorySpending[];
  subcategories: SubcategorySpending[];
}

interface MerchantInsight {
  id: string;
  name: string;
  category: string | null;
  total_spent: number;
  visit_count: number;
  average_ticket: number;
}

interface MerchantInsightsResponse {
  merchants: MerchantInsight[];
}

export function useSpendingTrends(months = 6): UseQueryResult<SpendingTrendsResponse> {
  return useQuery({
    queryKey: ANALYTICS_KEYS.spendingTrends(months),
    queryFn: async () => {
      return apiClient.get<SpendingTrendsResponse>("/analysis/spending-trends/data", {
        months: String(months),
      });
    },
  });
}

export function useCategorySpending(months = 6): UseQueryResult<CategorySpendingResponse> {
  return useQuery({
    queryKey: ANALYTICS_KEYS.categorySpending(months),
    queryFn: async () => {
      return apiClient.get<CategorySpendingResponse>("/analysis/category-spending/data", {
        months: String(months),
      });
    },
  });
}

export function useMerchantInsights(limit = 10): UseQueryResult<MerchantInsightsResponse> {
  return useQuery({
    queryKey: ANALYTICS_KEYS.merchantInsights(limit),
    queryFn: async () => {
      return apiClient.get<MerchantInsightsResponse>("/analysis/merchant-insights/data", {
        limit: String(limit),
      });
    },
  });
}
