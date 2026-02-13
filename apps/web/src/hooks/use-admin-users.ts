"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { adminApi } from "@/lib/admin-api";
import type {
  AdminUser,
  AdminUserDetail,
  AdminUserUpdateRequest,
  ImpersonateResponse,
  UserActivityResponse,
  UsersListResponse,
} from "@/types/admin";

const ADMIN_USERS_KEYS = {
  all: ["admin", "users"] as const,
  list: (params: Record<string, unknown>) =>
    [...ADMIN_USERS_KEYS.all, "list", params] as const,
  detail: (id: string) => [...ADMIN_USERS_KEYS.all, "detail", id] as const,
  activity: (id: string) =>
    [...ADMIN_USERS_KEYS.all, "activity", id] as const,
};

interface UseAdminUsersListParams {
  page?: number;
  perPage?: number;
  search?: string;
  isActive?: boolean;
  adminOnly?: boolean;
  includeDeleted?: boolean;
}

interface UseAdminUsersListReturn {
  users: AdminUser[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
  isLoading: boolean;
  error: Error | null;
}

export function useAdminUsersList(
  params: UseAdminUsersListParams = {}
): UseAdminUsersListReturn {
  const { page = 1, perPage = 20, search, isActive, adminOnly, includeDeleted } = params;

  const { data, isLoading, error } = useQuery({
    queryKey: ADMIN_USERS_KEYS.list(params),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.set("page", String(page));
      queryParams.set("per_page", String(perPage));
      if (search) {queryParams.set("search", search);}
      if (isActive !== undefined) {queryParams.set("is_active", String(isActive));}
      if (adminOnly) {queryParams.set("admin_only", "true");}
      if (includeDeleted) {queryParams.set("include_deleted", "true");}

      const response = await adminApi.get<UsersListResponse>(
        `/users?${queryParams.toString()}`
      );
      return response.data;
    },
  });

  return {
    users: data?.users || [],
    total: data?.total || 0,
    page: data?.page || 1,
    perPage: data?.per_page || 20,
    pages: data?.pages || 0,
    isLoading,
    error,
  };
}

interface UseAdminUserDetailReturn {
  user: AdminUserDetail | null;
  isLoading: boolean;
  error: Error | null;
}

export function useAdminUserDetail(userId: string): UseAdminUserDetailReturn {
  const { data, isLoading, error } = useQuery({
    queryKey: ADMIN_USERS_KEYS.detail(userId),
    queryFn: async () => {
      const response = await adminApi.get<AdminUserDetail>(`/users/${userId}`);
      return response.data;
    },
    enabled: !!userId,
  });

  return {
    user: data || null,
    isLoading,
    error,
  };
}

interface UseAdminUserActivityParams {
  page?: number;
  perPage?: number;
}

interface UseAdminUserActivityReturn {
  logs: UserActivityResponse["logs"];
  total: number;
  page: number;
  perPage: number;
  pages: number;
  isLoading: boolean;
  error: Error | null;
}

export function useAdminUserActivity(
  userId: string,
  params: UseAdminUserActivityParams = {}
): UseAdminUserActivityReturn {
  const { page = 1, perPage = 20 } = params;

  const { data, isLoading, error } = useQuery({
    queryKey: ADMIN_USERS_KEYS.activity(userId),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.set("page", String(page));
      queryParams.set("per_page", String(perPage));

      const response = await adminApi.get<UserActivityResponse>(
        `/users/${userId}/activity?${queryParams.toString()}`
      );
      return response.data;
    },
    enabled: !!userId,
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

interface UseUpdateAdminUserReturn {
  updateUser: (data: AdminUserUpdateRequest) => void;
  isPending: boolean;
  error: Error | null;
  isSuccess: boolean;
}

export function useUpdateAdminUser(
  userId: string
): UseUpdateAdminUserReturn {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: AdminUserUpdateRequest) => {
      const response = await adminApi.patch(`/users/${userId}`, data);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ADMIN_USERS_KEYS.detail(userId),
      });
      void queryClient.invalidateQueries({
        queryKey: ADMIN_USERS_KEYS.all,
      });
    },
  });

  return {
    updateUser: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}

interface UseDeleteAdminUserReturn {
  deleteUser: () => void;
  isPending: boolean;
  error: Error | null;
  isSuccess: boolean;
}

export function useDeleteAdminUser(userId: string): UseDeleteAdminUserReturn {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await adminApi.delete(`/users/${userId}`);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ADMIN_USERS_KEYS.all,
      });
    },
  });

  return {
    deleteUser: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}

interface UseRestoreAdminUserReturn {
  restoreUser: () => void;
  isPending: boolean;
  error: Error | null;
  isSuccess: boolean;
}

export function useRestoreAdminUser(userId: string): UseRestoreAdminUserReturn {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await adminApi.post(`/users/${userId}/restore`);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ADMIN_USERS_KEYS.detail(userId),
      });
      void queryClient.invalidateQueries({
        queryKey: ADMIN_USERS_KEYS.all,
      });
    },
  });

  return {
    restoreUser: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}

interface UseImpersonateUserReturn {
  impersonate: () => void;
  isPending: boolean;
  data: ImpersonateResponse | null;
  error: Error | null;
  isSuccess: boolean;
}

export function useImpersonateUser(userId: string): UseImpersonateUserReturn {
  const mutation = useMutation({
    mutationFn: async () => {
      const response = await adminApi.post<ImpersonateResponse>(
        `/users/${userId}/impersonate`
      );
      return response.data;
    },
  });

  return {
    impersonate: mutation.mutate,
    isPending: mutation.isPending,
    data: mutation.data || null,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}
