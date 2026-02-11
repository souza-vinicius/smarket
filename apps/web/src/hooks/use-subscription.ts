/**
 * React Query hooks for subscription management
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckoutRequest,
  CheckoutResponse,
  PaymentResponse,
  SubscriptionResponse,
  UsageResponse,
} from "@/types";
import api from "@/lib/api";

// Query keys
export const subscriptionKeys = {
  all: ["subscription"] as const,
  detail: () => [...subscriptionKeys.all, "detail"] as const,
  payments: () => [...subscriptionKeys.all, "payments"] as const,
};

// Get subscription and usage
export function useSubscription() {
  return useQuery({
    queryKey: subscriptionKeys.detail(),
    queryFn: async () => {
      const { data } = await api.get<{
        subscription: SubscriptionResponse;
        usage: UsageResponse;
      }>("/subscriptions");
      return data;
    },
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
  });
}

// Create Stripe Checkout session
export function useCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CheckoutRequest) => {
      const { data } = await api.post<CheckoutResponse>(
        "/subscriptions/checkout",
        request
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.detail() });
    },
  });
}

// Create Stripe Customer Portal session
export function usePortal() {
  return useMutation({
    mutationFn: async (returnUrl: string) => {
      const { data } = await api.post<{ url: string }>(
        "/subscriptions/portal",
        null,
        {
          params: { return_url: returnUrl },
        }
      );
      return data;
    },
  });
}

// Cancel subscription
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ message: string }>(
        "/subscriptions/cancel"
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.detail() });
    },
  });
}

// Get payment history
export function usePayments() {
  return useQuery({
    queryKey: subscriptionKeys.payments(),
    queryFn: async () => {
      const { data } = await api.get<PaymentResponse[]>("/subscriptions/payments");
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
