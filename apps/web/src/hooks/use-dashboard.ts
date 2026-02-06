'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { type DashboardSummary, type Analysis } from '@/types';

const DASHBOARD_KEYS = {
  summary: ['dashboard', 'summary'] as const,
  insights: ['dashboard', 'insights'] as const,
};

export function useDashboardSummary(): UseQueryResult<DashboardSummary> {
  return useQuery({
    queryKey: DASHBOARD_KEYS.summary,
    queryFn: async () => {
      // TODO: Replace with actual API call when endpoint is ready
      // return apiClient.get<DashboardSummary>('/analysis/dashboard/summary');
      
      // Mock data for now
      await new Promise((resolve) => { setTimeout(resolve, 500); });
      return {
        total_spent_this_month: 1250.50,
        total_spent_last_month: 980.00,
        month_over_month_change_percent: 27.6,
        invoice_count_this_month: 8,
        unread_insights_count: 3,
        top_merchant_this_month: {
          name: 'Supermercado Exemplo',
          total: 450.00,
        },
      } as DashboardSummary;
    },
  });
}

export function useRecentInsights(limit = 6): UseQueryResult<Analysis[]> {
  return useQuery({
    queryKey: [...DASHBOARD_KEYS.insights, limit],
    queryFn: async () => {
      // TODO: Replace with actual API call
      // return apiClient.get<Analysis[]>(`/analysis?limit=${limit}`);
      
      // Mock data for now
      await new Promise((resolve) => { setTimeout(resolve, 500); });
      return [
        {
          id: '1',
          user_id: '1',
          type: 'price_alert',
          title: 'Preço acima da média: Arroz',
          description: 'Você pagou R$ 25,90 pelo arroz, 30% acima da média histórica.',
          priority: 'high',
          details: { product: 'Arroz', price: 25.9, average: 19.9 },
          related_categories: ['Alimentos'],
          related_merchants: ['Supermercado Exemplo'],
          is_read: false,
          is_acted_upon: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ] as Analysis[];
    },
  });
}
