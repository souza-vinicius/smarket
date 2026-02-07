'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Invoice, InvoiceList, QRCodeRequest } from '@/types';

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
      return apiClient.get<Invoice>(`/invoices/${id}`);
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

export function useUploadImages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (files: File[]) => {
      return apiClient.uploadFiles<Invoice>('/invoices/upload/images', files);
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
