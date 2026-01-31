'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { DashboardSummary, Analysis } from '@/types';

const DASHBOARD_KEYS = {
  summary: ['dashboard', 'summary'] as const,
  insights: ['dashboard', 'insights'] as const,
};

export function useDashboardSummary() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.summary,
    queryFn: async () => {
      // TODO: Replace with actual API call when endpoint is ready
      // return apiClient.get<DashboardSummary>('/analysis/dashboard/summary');
      
      // Mock data for now
      await new Promise((resolve) => setTimeout(resolve, 500));
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

export function useRecentInsights(limit = 6) {
  return useQuery({
    queryKey: [...DASHBOARD_KEYS.insights, limit],
    queryFn: async () => {
      // TODO: Replace with actual API call
      // return apiClient.get<Analysis[]>(`/analysis?limit=${limit}`);
      
      // Mock data for now
      await new Promise((resolve) => setTimeout(resolve, 500));
      return [
        {
          id: '1',
          type: 'price_alert',
          title: 'Preço acima da média: Arroz',
          priority: 'high',
          description: 'Você pagou R$ 25,90 pelo arroz, 30% acima da média histórica de R$ 19,90. Considere comprar em outro estabelecimento.',
          is_read: false,
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          type: 'category_insight',
          title: 'Gasto elevado em Alimentos',
          priority: 'medium',
          description: 'Seus gastos com alimentos este mês estão 40% acima da média dos últimos 3 meses. Tente planejar suas compras com antecedência.',
          is_read: false,
          created_at: new Date().toISOString(),
        },
        {
          id: '3',
          type: 'merchant_pattern',
          title: 'Preços acima da média em Mercado X',
          priority: 'medium',
          description: 'O ticket médio neste estabelecimento é 25% maior que a média da categoria. Considere alternativas mais econômicas.',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ] as Analysis[];
    },
  });
}
