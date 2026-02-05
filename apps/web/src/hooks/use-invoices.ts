'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Invoice, InvoiceList, QRCodeRequest, ProcessingResponse } from '@/types';

const INVOICE_KEYS = {
  all: ['invoices'] as const,
  lists: () => [...INVOICE_KEYS.all, 'list'] as const,
  list: (filters: { skip?: number; limit?: number }) =>
    [...INVOICE_KEYS.lists(), filters] as const,
  details: () => [...INVOICE_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...INVOICE_KEYS.details(), id] as const,
};

export function useInvoices(skip = 0, limit = 100) {
  return useQuery({
    queryKey: INVOICE_KEYS.list({ skip, limit }),
    queryFn: async () => {
      return apiClient.get<InvoiceList[]>(`/invoices?skip=${skip}&limit=${limit}`);
    },
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: INVOICE_KEYS.detail(id),
    queryFn: async () => {
      const data = await apiClient.get<any>(`/invoices/${id}`);
      // Ensure items is an array
      if (data && !Array.isArray(data.items)) {
        data.items = data.products || [];
      }
      return data;
    },
    enabled: !!id,
  });
}

export function useProcessQRCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: QRCodeRequest) => {
      return apiClient.post<Invoice>('/invoices/qrcode', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.lists() });
    },
  });
}

export function useUploadXML() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      return apiClient.uploadFile<Invoice>('/invoices/upload/xml', file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.lists() });
    },
  });
}

export function useUploadPhotos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (files: File[]) => {
      return apiClient.uploadFiles<ProcessingResponse>('/invoices/upload/photos', files);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.lists() });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.lists() });
    },
  });
}

export function useProcessingStatus(processingId: string) {
  return useQuery({
    queryKey: ['processing', processingId],
    queryFn: async () => {
      return apiClient.get<{
        processing_id: string;
        status: string;
        extracted_data?: any;
        confidence_score?: number;
        errors: string[];
      }>(`/invoices/processing/${processingId}`);
    },
    enabled: !!processingId,
    refetchInterval: (query) => {
      // Stop refetching if status is extracted, confirmed, or error
      const status = query.state.data?.status;
      return status === 'pending' || status === 'processing' ? 2000 : false;
    },
    retry: 3,
  });
}

export function useConfirmInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      processingId,
      data,
    }: {
      processingId: string;
      data: any;
    }) => {
      return apiClient.post<Invoice>(
        `/invoices/processing/${processingId}/confirm`,
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.lists() });
    },
  });
}
