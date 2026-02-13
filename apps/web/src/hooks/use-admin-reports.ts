"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import type {
  ChurnReport,
  ConversionReport,
  MRRReport,
} from "@/types/admin";

const ADMIN_REPORTS_KEYS = {
  all: ["admin", "reports"] as const,
  churn: (months: number) =>
    [...ADMIN_REPORTS_KEYS.all, "churn", months] as const,
  conversion: (months: number) =>
    [...ADMIN_REPORTS_KEYS.all, "conversion", months] as const,
  mrr: (months: number) =>
    [...ADMIN_REPORTS_KEYS.all, "mrr", months] as const,
};

interface UseChurnReportReturn {
  report: ChurnReport | null;
  isLoading: boolean;
  error: Error | null;
}

export function useChurnReport(
  months: number = 12
): UseChurnReportReturn {
  const { data, isLoading, error } = useQuery({
    queryKey: ADMIN_REPORTS_KEYS.churn(months),
    queryFn: async () => {
      const response = await adminApi.get<ChurnReport>(
        `/reports/churn?months=${months}`
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    report: data || null,
    isLoading,
    error: error as Error | null,
  };
}

interface UseConversionReportReturn {
  report: ConversionReport | null;
  isLoading: boolean;
  error: Error | null;
}

export function useConversionReport(
  months: number = 12
): UseConversionReportReturn {
  const { data, isLoading, error } = useQuery({
    queryKey: ADMIN_REPORTS_KEYS.conversion(months),
    queryFn: async () => {
      const response = await adminApi.get<ConversionReport>(
        `/reports/conversion?months=${months}`
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    report: data || null,
    isLoading,
    error: error as Error | null,
  };
}

interface UseMRRReportReturn {
  report: MRRReport | null;
  isLoading: boolean;
  error: Error | null;
}

export function useMRRReport(
  months: number = 12
): UseMRRReportReturn {
  const { data, isLoading, error } = useQuery({
    queryKey: ADMIN_REPORTS_KEYS.mrr(months),
    queryFn: async () => {
      const response = await adminApi.get<MRRReport>(
        `/reports/mrr?months=${months}`
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    report: data || null,
    isLoading,
    error: error as Error | null,
  };
}

// CSV Export functions
export async function exportUsersCSV(
  includeDeleted: boolean = false
): Promise<void> {
  const response = await adminApi.get(
    `/reports/export/users?include_deleted=${includeDeleted}`,
    { responseType: "blob" }
  );

  const url = window.URL.createObjectURL(
    new Blob([response.data], { type: "text/csv" })
  );
  const link = document.createElement("a");
  link.href = url;

  // Extract filename from Content-Disposition header
  const contentDisposition = response.headers["content-disposition"];
  const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
  const filename = filenameMatch
    ? filenameMatch[1]
    : `users_export_${new Date().toISOString().split("T")[0]}.csv`;

  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function exportSubscriptionsCSV(
  status?: string
): Promise<void> {
  const params = new URLSearchParams();
  if (status) params.append("status", status);

  const response = await adminApi.get(
    `/reports/export/subscriptions?${params.toString()}`,
    { responseType: "blob" }
  );

  const url = window.URL.createObjectURL(
    new Blob([response.data], { type: "text/csv" })
  );
  const link = document.createElement("a");
  link.href = url;

  const contentDisposition = response.headers["content-disposition"];
  const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
  const filename = filenameMatch
    ? filenameMatch[1]
    : `subscriptions_export_${new Date().toISOString().split("T")[0]}.csv`;

  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function exportPaymentsCSV(
  status?: string,
  months: number = 12
): Promise<void> {
  const params = new URLSearchParams();
  params.append("months", months.toString());
  if (status) params.append("status", status);

  const response = await adminApi.get(
    `/reports/export/payments?${params.toString()}`,
    { responseType: "blob" }
  );

  const url = window.URL.createObjectURL(
    new Blob([response.data], { type: "text/csv" })
  );
  const link = document.createElement("a");
  link.href = url;

  const contentDisposition = response.headers["content-disposition"];
  const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
  const filename = filenameMatch
    ? filenameMatch[1]
    : `payments_export_${new Date().toISOString().split("T")[0]}.csv`;

  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
