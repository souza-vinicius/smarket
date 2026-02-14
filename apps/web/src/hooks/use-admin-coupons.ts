"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { adminApi } from "@/lib/admin-api";
import type {
  CouponListItem,
  CouponResponse,
  CouponCreate,
  CouponUpdate,
  CouponUsageResponse,
  CouponStatsResponse,
} from "@/types/admin";

const ADMIN_COUPONS_KEYS = {
  all: ["admin", "coupons"] as const,
  lists: () => [...ADMIN_COUPONS_KEYS.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...ADMIN_COUPONS_KEYS.lists(), filters] as const,
  detail: (id: string) => [...ADMIN_COUPONS_KEYS.all, "detail", id] as const,
  usages: (id: string, params: Record<string, unknown>) =>
    [...ADMIN_COUPONS_KEYS.all, "usages", id, params] as const,
  stats: (id: string) => [...ADMIN_COUPONS_KEYS.all, "stats", id] as const,
};

interface CouponsListParams {
  is_active?: boolean;
  search?: string;
  page?: number;
  per_page?: number;
}

interface CouponsListResponse {
  coupons: CouponListItem[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export function useAdminCoupons(params: CouponsListParams = {}) {
  const {
    is_active,
    search,
    page = 1,
    per_page = 20,
  } = params;

  const { data, isLoading, error } = useQuery({
    queryKey: ADMIN_COUPONS_KEYS.list({ is_active, search, page, per_page }),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (is_active !== undefined) {queryParams.set("is_active", String(is_active));}
      if (search) {queryParams.set("search", search);}
      queryParams.set("page", String(page));
      queryParams.set("per_page", String(per_page));

      const response = await adminApi.get<CouponsListResponse>(
        `/coupons?${queryParams.toString()}`
      );
      return response.data;
    },
  });

  return {
    coupons: data?.coupons || [],
    total: data?.total || 0,
    page: data?.page || 1,
    perPage: data?.per_page || 20,
    pages: data?.pages || 0,
    isLoading,
    error,
  };
}

export function useAdminCoupon(couponId: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ADMIN_COUPONS_KEYS.detail(couponId),
    queryFn: async () => {
      const response = await adminApi.get<CouponResponse>(
        `/coupons/${couponId}`
      );
      return response.data;
    },
    enabled: !!couponId,
  });

  return {
    coupon: data || null,
    isLoading,
    error,
  };
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CouponCreate) => {
      const response = await adminApi.post<CouponResponse>("/coupons", data);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_COUPONS_KEYS.lists() });
    },
  });
}

export function useUpdateCoupon(couponId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CouponUpdate) => {
      const response = await adminApi.put<CouponResponse>(
        `/coupons/${couponId}`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_COUPONS_KEYS.detail(couponId) });
      void queryClient.invalidateQueries({ queryKey: ADMIN_COUPONS_KEYS.lists() });
    },
  });
}

export function useDeactivateCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (couponId: string) => {
      const response = await adminApi.delete<{ message: string }>(
        `/coupons/${couponId}`
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_COUPONS_KEYS.lists() });
    },
  });
}

interface CouponUsagesParams {
  page?: number;
  per_page?: number;
}

interface CouponUsagesResponse {
  usages: CouponUsageResponse[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export function useCouponUsages(couponId: string, params: CouponUsagesParams = {}) {
  const { page = 1, per_page = 20 } = params;

  const { data, isLoading, error } = useQuery({
    queryKey: ADMIN_COUPONS_KEYS.usages(couponId, { page, per_page }),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.set("page", String(page));
      queryParams.set("per_page", String(per_page));

      const response = await adminApi.get<CouponUsagesResponse>(
        `/coupons/${couponId}/usages?${queryParams.toString()}`
      );
      return response.data;
    },
    enabled: !!couponId,
  });

  return {
    usages: data?.usages || [],
    total: data?.total || 0,
    page: data?.page || 1,
    perPage: data?.per_page || 20,
    pages: data?.pages || 0,
    isLoading,
    error,
  };
}

export function useCouponStats(couponId: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ADMIN_COUPONS_KEYS.stats(couponId),
    queryFn: async () => {
      const response = await adminApi.get<CouponStatsResponse>(
        `/coupons/${couponId}/stats`
      );
      return response.data;
    },
    enabled: !!couponId,
  });

  return {
    stats: data || null,
    isLoading,
    error,
  };
}
