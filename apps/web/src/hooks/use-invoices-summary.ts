import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api";

interface Category {
  category: string;
  total: number;
}

export interface InvoicesSummary {
  total_invoices: number;
  total_spent: number;
  top_categories: Category[];
}

export function useInvoicesSummary() {
  return useQuery<InvoicesSummary>({
    queryKey: ["invoices-summary"],
    queryFn: async () => {
      const response = await apiClient.get<InvoicesSummary>("/invoices/stats/summary");
      return response;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data fresh for 10 seconds
  });
}
