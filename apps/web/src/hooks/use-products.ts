"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface Product {
  id: string;
  description: string;
  normalized_name?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  issue_date: string;
  issuer_name: string;
  merchant_name?: string;
  invoice_id: string;
}

interface ProductsResponse {
  items: Product[];
  total: number;
}

// Get all invoice items (product purchases) for the current user
export function useProducts(search?: string) {
  return useQuery({
    queryKey: ["products", search],
    queryFn: async () => {
      // Use search-purchases endpoint which returns individual purchase records
      // If no search query, get all purchases with empty search
      const url = search && search.length >= 2
        ? `/products/search-purchases?q=${encodeURIComponent(search)}`
        : `/products/search-purchases?q=`;
      
      const response = await apiClient.get<Product[]>(url);
      return response;
    },
  });
}

// Search products with a query
export function useSearchProducts(query: string) {
  return useQuery({
    queryKey: ["products", "search", query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      
      const response = await apiClient.get<Product[]>(
        `/products/search-purchases?q=${encodeURIComponent(query)}`
      );
      return response;
    },
    enabled: query.length >= 2,
  });
}
