'use client';

import { useState, useEffect } from 'react';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { apiClient } from '@/lib/api';
import { type ProductPurchaseResult } from '@/types';

const PRODUCT_KEYS = {
  all: ['products'] as const,
  searchPurchases: (q: string) => [...PRODUCT_KEYS.all, 'search-purchases', q] as const,
};

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => { setDebounced(value); }, delay);
    return () => { clearTimeout(timer); };
  }, [value, delay]);

  return debounced;
}

export function useProductSearch(query: string): UseQueryResult<ProductPurchaseResult[]> & { debouncedQuery: string } {
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const result = useQuery({
    queryKey: PRODUCT_KEYS.searchPurchases(debouncedQuery),
    queryFn: async () => {
      return apiClient.get<ProductPurchaseResult[]>(
        `/products/search-purchases?q=${encodeURIComponent(debouncedQuery)}`
      );
    },
    enabled: debouncedQuery.length >= 2,
  });

  return { ...result, debouncedQuery };
}
