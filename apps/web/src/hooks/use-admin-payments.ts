"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import type {
  AdminPayment,
  AdminPaymentDetail,
  PaymentsListResponse,
  RefundRequest,
  RefundResponse,
} from "@/types/admin";

const ADMIN_PAYMENTS_KEYS = {
  all: ["admin", "payments"] as const,
  list: (params: Record<string, unknown>) =>
    [...ADMIN_PAYMENTS_KEYS.all, "list", params] as const,
  detail: (id: string) => [...ADMIN_PAYMENTS_KEYS.all, "detail", id] as const,
};

interface UseAdminPaymentsListParams {
  page?: number;
  perPage?: number;
  status?: string;
  search?: string;
}

interface UseAdminPaymentsListReturn {
  payments: AdminPayment[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
  isLoading: boolean;
  error: Error | null;
}

export function useAdminPaymentsList(
  params: UseAdminPaymentsListParams = {}
): UseAdminPaymentsListReturn {
  const { page = 1, perPage = 20, status, search } = params;

  const { data, isLoading, error } = useQuery({
    queryKey: ADMIN_PAYMENTS_KEYS.list(params),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.set("page", String(page));
      queryParams.set("per_page", String(perPage));
      if (status) queryParams.set("status", status);
      if (search) queryParams.set("search", search);

      const response = await adminApi.get<PaymentsListResponse>(
        `/payments?${queryParams.toString()}`
      );
      return response.data;
    },
  });

  return {
    payments: data?.payments || [],
    total: data?.total || 0,
    page: data?.page || 1,
    perPage: data?.per_page || 20,
    pages: data?.pages || 0,
    isLoading,
    error: error as Error | null,
  };
}

interface UseAdminPaymentDetailReturn {
  payment: AdminPaymentDetail | null;
  isLoading: boolean;
  error: Error | null;
}

export function useAdminPaymentDetail(
  paymentId: string
): UseAdminPaymentDetailReturn {
  const { data, isLoading, error } = useQuery({
    queryKey: ADMIN_PAYMENTS_KEYS.detail(paymentId),
    queryFn: async () => {
      const response = await adminApi.get<AdminPaymentDetail>(`/payments/${paymentId}`);
      return response.data;
    },
    enabled: !!paymentId,
  });

  return {
    payment: data || null,
    isLoading,
    error: error as Error | null,
  };
}

interface UseRefundPaymentReturn {
  refundPayment: (data: RefundRequest) => void;
  isPending: boolean;
  data: RefundResponse | null;
  error: Error | null;
  isSuccess: boolean;
}

export function useRefundPayment(paymentId: string): UseRefundPaymentReturn {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: RefundRequest) => {
      const response = await adminApi.post<RefundResponse>(
        `/payments/${paymentId}/refund`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ADMIN_PAYMENTS_KEYS.detail(paymentId),
      });
      void queryClient.invalidateQueries({
        queryKey: ADMIN_PAYMENTS_KEYS.all,
      });
    },
  });

  return {
    refundPayment: mutation.mutate,
    isPending: mutation.isPending,
    data: mutation.data || null,
    error: mutation.error as Error | null,
    isSuccess: mutation.isSuccess,
  };
}
