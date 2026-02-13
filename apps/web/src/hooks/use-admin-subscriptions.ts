"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { adminApi } from "@/lib/admin-api";
import type {
  AdminSubscription,
  AdminSubscriptionDetail,
  SubscriptionsListResponse,
  ExtendTrialRequest,
} from "@/types/admin";

const ADMIN_SUBSCRIPTIONS_KEYS = {
  all: ["admin", "subscriptions"] as const,
  list: (params: Record<string, unknown>) =>
    [...ADMIN_SUBSCRIPTIONS_KEYS.all, "list", params] as const,
  detail: (id: string) => [...ADMIN_SUBSCRIPTIONS_KEYS.all, "detail", id] as const,
};

interface UseAdminSubscriptionsListParams {
  page?: number;
  perPage?: number;
  status?: string;
  plan?: string;
  search?: string;
}

interface UseAdminSubscriptionsListReturn {
  subscriptions: AdminSubscription[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
  isLoading: boolean;
  error: Error | null;
}

export function useAdminSubscriptionsList(
  params: UseAdminSubscriptionsListParams = {}
): UseAdminSubscriptionsListReturn {
  const { page = 1, perPage = 20, status, plan, search } = params;

  const { data, isLoading, error } = useQuery({
    queryKey: ADMIN_SUBSCRIPTIONS_KEYS.list(params),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.set("page", String(page));
      queryParams.set("per_page", String(perPage));
      if (status) {queryParams.set("status", status);}
      if (plan) {queryParams.set("plan", plan);}
      if (search) {queryParams.set("search", search);}

      const response = await adminApi.get<SubscriptionsListResponse>(
        `/subscriptions?${queryParams.toString()}`
      );
      return response.data;
    },
  });

  return {
    subscriptions: data?.subscriptions || [],
    total: data?.total || 0,
    page: data?.page || 1,
    perPage: data?.per_page || 20,
    pages: data?.pages || 0,
    isLoading,
    error,
  };
}

interface UseAdminSubscriptionDetailReturn {
  subscription: AdminSubscriptionDetail | null;
  isLoading: boolean;
  error: Error | null;
}

export function useAdminSubscriptionDetail(
  subscriptionId: string
): UseAdminSubscriptionDetailReturn {
  const { data, isLoading, error } = useQuery({
    queryKey: ADMIN_SUBSCRIPTIONS_KEYS.detail(subscriptionId),
    queryFn: async () => {
      const response = await adminApi.get<AdminSubscriptionDetail>(
        `/subscriptions/${subscriptionId}`
      );
      return response.data;
    },
    enabled: !!subscriptionId,
  });

  return {
    subscription: data || null,
    isLoading,
    error,
  };
}

interface UseCancelSubscriptionReturn {
  cancelSubscription: () => void;
  isPending: boolean;
  error: Error | null;
  isSuccess: boolean;
}

export function useCancelSubscription(
  subscriptionId: string
): UseCancelSubscriptionReturn {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await adminApi.post(`/subscriptions/${subscriptionId}/cancel`);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ADMIN_SUBSCRIPTIONS_KEYS.detail(subscriptionId),
      });
      void queryClient.invalidateQueries({
        queryKey: ADMIN_SUBSCRIPTIONS_KEYS.all,
      });
    },
  });

  return {
    cancelSubscription: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}

interface UseExtendTrialReturn {
  extendTrial: (data: ExtendTrialRequest) => void;
  isPending: boolean;
  error: Error | null;
  isSuccess: boolean;
}

export function useExtendTrial(subscriptionId: string): UseExtendTrialReturn {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: ExtendTrialRequest) => {
      const response = await adminApi.post(
        `/subscriptions/${subscriptionId}/extend-trial`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ADMIN_SUBSCRIPTIONS_KEYS.detail(subscriptionId),
      });
      void queryClient.invalidateQueries({
        queryKey: ADMIN_SUBSCRIPTIONS_KEYS.all,
      });
    },
  });

  return {
    extendTrial: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}
