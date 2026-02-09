"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";

import { apiClient } from "@/lib/api";
import {
  type Invoice,
  type InvoiceList,
  type QRCodeRequest,
  type ProcessingResponse,
  type InvoiceProcessingList,
  type InvoiceUpdateRequest,
} from "@/types";

const INVOICE_KEYS = {
  all: ["invoices"] as const,
  lists: () => [...INVOICE_KEYS.all, "list"] as const,
  list: (filters: { skip?: number; limit?: number }) => [...INVOICE_KEYS.lists(), filters] as const,
  details: () => [...INVOICE_KEYS.all, "detail"] as const,
  detail: (id: string) => [...INVOICE_KEYS.details(), id] as const,
  processing: () => [...INVOICE_KEYS.all, "processing"] as const,
};

interface InvoiceWithItems extends Invoice {
  items?: {
    id?: string;
    code?: string;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
    category_name?: string;
    subcategory?: string;
  }[];
}

export interface InvoiceItemData {
  code?: string;
  description: string;
  normalized_name?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  category_name?: string;
  subcategory?: string;
}

export interface PotentialDuplicate {
  invoice_id: string;
  number?: string;
  issue_date?: string;
  total_value?: number;
  issuer_name?: string;
  match_type?: string;
}

export interface ExtractedInvoiceData {
  access_key: string;
  number: string;
  series: string;
  issue_date: string;
  issuer_name: string;
  issuer_cnpj: string;
  total_value: number;
  items: InvoiceItemData[];
  image_count?: number;
  confidence: number;
  warnings: string[];
  potential_duplicates?: PotentialDuplicate[];
  [key: string]: unknown;
}

interface ProcessingStatusResponse {
  processing_id: string;
  status: string;
  extracted_data?: ExtractedInvoiceData;
  confidence_score?: number;
  errors: string[];
}

export type ConfirmInvoiceData = ExtractedInvoiceData;

export function useInvoices(skip = 0, limit = 100): UseQueryResult<InvoiceList[]> {
  return useQuery({
    queryKey: INVOICE_KEYS.list({ skip, limit }),
    queryFn: async () => {
      return apiClient.get<InvoiceList[]>(`/invoices?skip=${String(skip)}&limit=${String(limit)}`);
    },
  });
}

export function useInvoice(id: string): UseQueryResult<InvoiceWithItems> {
  return useQuery({
    queryKey: INVOICE_KEYS.detail(id),
    queryFn: async () => {
      const data = await apiClient.get<InvoiceWithItems>(`/invoices/${id}`);
      // Ensure items is an array
      if (!Array.isArray(data.items)) {
        data.items = data.products ?? [];
      }
      return data;
    },
    enabled: !!id,
  });
}

export function useProcessQRCode(): UseMutationResult<Invoice, Error, QRCodeRequest> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: QRCodeRequest) => {
      return apiClient.post<Invoice>("/invoices/qrcode", data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.lists() });
    },
  });
}

export function useUploadXML(): UseMutationResult<Invoice, Error, File> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      return apiClient.uploadFile<Invoice>("/invoices/upload/xml", file);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.lists() });
    },
  });
}

export function useUploadImages(): UseMutationResult<Invoice, Error, File[]> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (files: File[]) => {
      return apiClient.uploadFiles<Invoice>("/invoices/upload/images", files);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.lists() });
    },
  });
}

export function useUploadPhotos(): UseMutationResult<ProcessingResponse, Error, File[]> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (files: File[]) => {
      return apiClient.uploadFiles<ProcessingResponse>("/invoices/upload/photos", files);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.lists() });
    },
  });
}

export function useDeleteInvoice(): UseMutationResult<unknown, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/invoices/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.lists() });
    },
  });
}

export function useProcessingStatus(
  processingId: string
): UseQueryResult<ProcessingStatusResponse> {
  return useQuery({
    queryKey: ["processing", processingId],
    queryFn: async () => {
      return apiClient.get<ProcessingStatusResponse>(`/invoices/processing/${processingId}`);
    },
    enabled: !!processingId,
    refetchInterval: (query) => {
      // Stop refetching if status is extracted, confirmed, or error
      // Polls every 2 seconds while status is "pending" or "processing"
      const status = query.state.data?.status;
      return status === "pending" || status === "processing" ? 3000 : false;
    },
    retry: 3,
  });
}

export function useConfirmInvoice(): UseMutationResult<
  Invoice,
  Error,
  { processingId: string; data: ConfirmInvoiceData }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      processingId,
      data,
    }: {
      processingId: string;
      data: ConfirmInvoiceData;
    }) => {
      return apiClient.post<Invoice>(`/invoices/processing/${processingId}/confirm`, data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.lists() });
      void queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.processing() });
    },
  });
}

export function usePendingProcessing(
  skip = 0,
  limit = 100
): UseQueryResult<InvoiceProcessingList[]> {
  return useQuery({
    queryKey: ["pending-processing", { skip, limit }],
    queryFn: async () => {
      return apiClient.get<InvoiceProcessingList[]>(
        `/invoices/processing?skip=${String(skip)}&limit=${String(limit)}`
      );
    },
    refetchInterval: 5000, // Refresh every 5 seconds while processing is active
  });
}

export function useDeleteProcessing(): UseMutationResult<unknown, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (processingId: string) => {
      return apiClient.delete(`/invoices/processing/${processingId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pending-processing"] });
    },
  });
}

export function useUpdateInvoice(): UseMutationResult<
  Invoice,
  Error,
  { id: string; data: InvoiceUpdateRequest }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InvoiceUpdateRequest }) => {
      return apiClient.put<Invoice>(`/invoices/${id}`, data);
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.detail(variables.id) });
      void queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.lists() });
    },
  });
}
