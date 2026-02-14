"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api";

// Spending Trends
interface Trend {
  month: string;
  total: number;
  invoice_count: number;
}

interface SpendingTrendsResponse {
  period_months: number;
  trends: Trend[];
}

export function useSpendingTrends(months = 6) {
  return useQuery({
    queryKey: ["analytics", "spending-trends", months],
    queryFn: async () => {
      return apiClient.get<SpendingTrendsResponse>(
        `/analysis/spending-trends/data?months=${months}`
      );
    },
  });
}

// Merchant Insights
interface MerchantInsight {
  id: string;
  name: string;
  category?: string;
  total_spent: number;
  visit_count: number;
  average_ticket: number;
}

interface MerchantInsightsResponse {
  merchants: MerchantInsight[];
}

export function useMerchantInsights(limit = 10) {
  return useQuery({
    queryKey: ["analytics", "merchant-insights", limit],
    queryFn: async () => {
      return apiClient.get<MerchantInsightsResponse>(
        `/analysis/merchant-insights/data?limit=${limit}`
      );
    },
  });
}

// Category Spending
interface Category {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  total_spent: number;
}

interface Subcategory {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  parent_id: string | null;
  parent_name: string;
  total_spent: number;
}

interface CategorySpendingResponse {
  period_months: number;
  categories: Category[];
  subcategories: Subcategory[];
}

export function useCategorySpending(months = 6) {
  return useQuery({
    queryKey: ["analytics", "category-spending", months],
    queryFn: async () => {
      return apiClient.get<CategorySpendingResponse>(
        `/analysis/category-spending/data?months=${months}`
      );
    },
  });
}
