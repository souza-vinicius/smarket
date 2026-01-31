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
      // TODO: Replace with actual API call
      // return apiClient.get<InvoiceList[]>(`/invoices?skip=${skip}&limit=${limit}`);
      
      // Mock data for now
      await new Promise((resolve) => setTimeout(resolve, 500));
      return [
        {
          id: '1',
          access_key: '35240112345678000190550010001234567890123456',
          issuer_name: 'Supermercado Exemplo Ltda',
          total_value: 250.75,
          issue_date: '2024-01-15T10:30:00Z',
          product_count: 12,
          created_at: '2024-01-15T10:30:00Z',
        },
        {
          id: '2',
          access_key: '35240112345678000190550010001234567890123457',
          issuer_name: 'Farmácia Saúde',
          total_value: 89.90,
          issue_date: '2024-01-14T15:20:00Z',
          product_count: 3,
          created_at: '2024-01-14T15:20:00Z',
        },
        {
          id: '3',
          access_key: '35240112345678000190550010001234567890123458',
          issuer_name: 'Posto de Gasolina Shell',
          total_value: 150.00,
          issue_date: '2024-01-13T09:00:00Z',
          product_count: 1,
          created_at: '2024-01-13T09:00:00Z',
        },
      ] as InvoiceList[];
    },
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: INVOICE_KEYS.detail(id),
    queryFn: async () => {
      // TODO: Replace with actual API call
      // return apiClient.get<Invoice>(`/invoices/${id}`);
      
      // Mock data for now
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {
        id,
        access_key: '35240112345678000190550010001234567890123456',
        number: '123456',
        series: '1',
        issue_date: '2024-01-15T10:30:00Z',
        issuer_cnpj: '12.345.678/0001-90',
        issuer_name: 'Supermercado Exemplo Ltda',
        total_value: 250.75,
        type: 'NFC-e',
        source: 'qrcode',
        user_id: '1',
        created_at: '2024-01-15T10:30:00Z',
        products: [
          {
            id: '1',
            code: '123456',
            description: 'Arroz Branco 5kg',
            quantity: 2,
            unit: 'UN',
            unit_price: 25.90,
            total_price: 51.80,
          },
          {
            id: '2',
            code: '123457',
            description: 'Feijão Carioca 1kg',
            quantity: 3,
            unit: 'UN',
            unit_price: 8.50,
            total_price: 25.50,
          },
        ],
      } as Invoice;
    },
    enabled: !!id,
  });
}

export function useProcessQRCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: QRCodeRequest) => {
      // TODO: Replace with actual API call
      // return apiClient.post<Invoice>('/invoices/qrcode', data);
      
      // Mock data for now
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return {
        id: '4',
        access_key: '35240112345678000190550010001234567890123459',
        number: '123457',
        series: '1',
        issue_date: new Date().toISOString(),
        issuer_cnpj: '12.345.678/0001-90',
        issuer_name: 'Novo Estabelecimento',
        total_value: 100.00,
        type: 'NFC-e',
        source: 'qrcode',
        user_id: '1',
        created_at: new Date().toISOString(),
        products: [],
      } as Invoice;
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
      // TODO: Replace with actual API call
      // return apiClient.uploadFile<Invoice>('/invoices/xml', file);
      
      // Mock data for now
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return {
        id: '5',
        access_key: '35240112345678000190550010001234567890123460',
        number: '123458',
        series: '1',
        issue_date: new Date().toISOString(),
        issuer_cnpj: '12.345.678/0001-91',
        issuer_name: 'Estabelecimento XML',
        total_value: 200.00,
        type: 'NF-e',
        source: 'xml',
        user_id: '1',
        created_at: new Date().toISOString(),
        products: [],
      } as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.lists() });
    },
  });
}
