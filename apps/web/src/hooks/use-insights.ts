'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Analysis } from '@/types';

const INSIGHT_KEYS = {
  all: ['insights'] as const,
  lists: () => [...INSIGHT_KEYS.all, 'list'] as const,
  list: (filters: { type?: string; priority?: string; is_read?: boolean }) =>
    [...INSIGHT_KEYS.lists(), filters] as const,
  details: () => [...INSIGHT_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...INSIGHT_KEYS.details(), id] as const,
};

export function useInsights(filters: {
  type?: string;
  priority?: string;
  is_read?: boolean;
  skip?: number;
  limit?: number;
} = {}) {
  const { type, priority, is_read } = filters;

  return useQuery({
    queryKey: INSIGHT_KEYS.list({ type, priority, is_read }),
    queryFn: async () => {
      // TODO: Replace with actual API call
      // const params = new URLSearchParams();
      // if (type) params.append('type', type);
      // if (priority) params.append('priority', priority);
      // if (is_read !== undefined) params.append('is_read', String(is_read));
      // params.append('skip', String(skip));
      // params.append('limit', String(limit));
      // return apiClient.get<Analysis[]>(`/analysis?${params.toString()}`);

      // Mock data for now
      await new Promise((resolve) => setTimeout(resolve, 500));
      return [
        {
          id: '1',
          user_id: '1',
          type: 'price_alert',
          title: 'Preço acima da média: Arroz',
          description:
            'Você pagou R$ 25,90 pelo arroz, 30% acima da média histórica de R$ 19,90. Considere comprar em outro estabelecimento.',
          priority: 'high',
          details: { product: 'Arroz', price: 25.9, average: 19.9 },
          related_categories: ['Alimentos'],
          related_merchants: ['Supermercado Exemplo'],
          is_read: false,
          is_acted_upon: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          user_id: '1',
          type: 'category_insight',
          title: 'Gasto elevado em Alimentos',
          description:
            'Seus gastos com alimentos este mês estão 40% acima da média dos últimos 3 meses. Tente planejar suas compras com antecedência.',
          priority: 'medium',
          details: { category: 'Alimentos', increase: 40 },
          related_categories: ['Alimentos'],
          related_merchants: [],
          is_read: false,
          is_acted_upon: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '3',
          user_id: '1',
          type: 'merchant_pattern',
          title: 'Preços acima da média em Mercado X',
          description:
            'O ticket médio neste estabelecimento é 25% maior que a média da categoria. Considere alternativas mais econômicas.',
          priority: 'medium',
          details: { merchant: 'Mercado X', difference: 25 },
          related_categories: [],
          related_merchants: ['Mercado X'],
          is_read: false,
          is_acted_upon: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '4',
          user_id: '1',
          type: 'savings_opportunity',
          title: 'Oportunidade de economia detectada',
          description:
            'Você compra leite toda semana no mesmo mercado. Comprar em atacado pode gerar economia de 15%.',
          priority: 'low',
          details: { product: 'Leite', potential_savings: 15 },
          related_categories: ['Laticínios'],
          related_merchants: [],
          is_read: true,
          is_acted_upon: false,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          updated_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ] as Analysis[];
    },
  });
}

export function useInsight(id: string) {
  return useQuery({
    queryKey: INSIGHT_KEYS.detail(id),
    queryFn: async () => {
      // TODO: Replace with actual API call
      // return apiClient.get<Analysis>(`/analysis/${id}`);

      // Mock data for now
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {
        id,
        user_id: '1',
        type: 'price_alert',
        title: 'Preço acima da média: Arroz',
        description:
          'Você pagou R$ 25,90 pelo arroz, 30% acima da média histórica de R$ 19,90. Considere comprar em outro estabelecimento.',
        priority: 'high',
        details: { product: 'Arroz', price: 25.9, average: 19.9 },
        related_categories: ['Alimentos'],
        related_merchants: ['Supermercado Exemplo'],
        is_read: false,
        is_acted_upon: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Analysis;
    },
    enabled: !!id,
  });
}

export function useMarkInsightAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_id: string) => {
      // TODO: Replace with actual API call
      // return apiClient.post<Analysis>(`/analysis/${_id}/read`);

      // Mock data for now
      await new Promise((resolve) => setTimeout(resolve, 300));
      return { success: true };
    },
    onSuccess: () => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      queryClient.invalidateQueries({ queryKey: INSIGHT_KEYS.lists() });
    },
  });
}

export function useDismissInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_id: string) => {
      // TODO: Replace with actual API call
      // return apiClient.post<Analysis>(`/analysis/${_id}/dismiss`);

      // Mock data for now
      await new Promise((resolve) => setTimeout(resolve, 300));
      return { success: true };
    },
    onSuccess: () => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      queryClient.invalidateQueries({ queryKey: INSIGHT_KEYS.lists() });
    },
  });
}
