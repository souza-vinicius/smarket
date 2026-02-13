"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { adminApi } from "@/lib/admin-api";
import type {
  SettingsResponse,
  FeatureFlagsUpdate,
  FeatureFlagsUpdateResponse,
  RolesResponse,
  AuditLogsResponse,
} from "@/types/admin";

const ADMIN_SETTINGS_KEYS = {
  all: ["admin", "settings"] as const,
  flags: () => [...ADMIN_SETTINGS_KEYS.all, "flags"] as const,
  roles: () => [...ADMIN_SETTINGS_KEYS.all, "roles"] as const,
  auditLogs: (params: Record<string, unknown>) =>
    [...ADMIN_SETTINGS_KEYS.all, "audit-logs", params] as const,
};

export function useAdminSettings() {
  const { data, isLoading, error } = useQuery({
    queryKey: ADMIN_SETTINGS_KEYS.flags(),
    queryFn: async () => {
      const response = await adminApi.get<SettingsResponse>("/settings/");
      return response.data;
    },
  });

  return {
    settings: data || null,
    isLoading,
    error,
  };
}

export function useUpdateFeatureFlags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: FeatureFlagsUpdate) => {
      const response = await adminApi.put<FeatureFlagsUpdateResponse>(
        "/settings/feature-flags",
        data
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ADMIN_SETTINGS_KEYS.flags(),
      });
    },
  });
}

export function useAdminRoles() {
  const { data, isLoading, error } = useQuery({
    queryKey: ADMIN_SETTINGS_KEYS.roles(),
    queryFn: async () => {
      const response = await adminApi.get<RolesResponse>("/settings/roles");
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - roles rarely change
  });

  return {
    roles: data?.roles || [],
    isLoading,
    error,
  };
}

interface UseAuditLogsParams {
  page?: number;
  perPage?: number;
  resourceType?: string;
  action?: string;
}

export function useAuditLogs(params: UseAuditLogsParams = {}) {
  const { page = 1, perPage = 20, resourceType, action } = params;

  const { data, isLoading, error } = useQuery({
    queryKey: ADMIN_SETTINGS_KEYS.auditLogs(params as unknown as Record<string, unknown>),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.set("page", String(page));
      queryParams.set("per_page", String(perPage));
      if (resourceType) {queryParams.set("resource_type", resourceType);}
      if (action) {queryParams.set("action", action);}

      const response = await adminApi.get<AuditLogsResponse>(
        `/audit-logs?${queryParams.toString()}`
      );
      return response.data;
    },
  });

  return {
    logs: data?.logs || [],
    total: data?.total || 0,
    page: data?.page || 1,
    perPage: data?.per_page || 20,
    pages: data?.pages || 0,
    isLoading,
    error,
  };
}
