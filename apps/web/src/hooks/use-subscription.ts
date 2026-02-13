/**
 * React Query hooks for subscription management
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api";
import {
  type CheckoutRequest,
  type CheckoutResponse,
  type PaymentResponse,
  type SubscriptionResponse,
  type UsageResponse,
} from "@/types";

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
      return apiClient.get<{
        subscription: SubscriptionResponse;
        usage: UsageResponse;
      }>("/subscriptions");
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
      return apiClient.post<CheckoutResponse>(
        "/subscriptions/checkout",
        request
      );
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
      return apiClient.post<{ url: string }>(
        `/subscriptions/portal?return_url=${encodeURIComponent(returnUrl)}`
      );
    },
  });
}

// Cancel subscription
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return apiClient.post<{ message: string }>(
        "/subscriptions/cancel"
      );
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
      return apiClient.get<PaymentResponse[]>("/subscriptions/payments");
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
