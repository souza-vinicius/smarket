import { useMutation } from '@tanstack/react-query';
import { type AxiosError } from 'axios';
import { apiClient } from '@/lib/api';
import { cleanCNPJ } from '@/lib/cnpj';

interface CNPJEnrichmentData {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
  situacao: string;
  cnae_fiscal: string;
  data_abertura: string;
  source: string;
}

interface CNPJEnrichmentResponse {
  success: boolean;
  cnpj: string;
  data: CNPJEnrichmentData;
  suggested_name: string;
}

interface CNPJEnrichmentError {
  error: string;
  message: string;
  hint?: string;
  cnpj?: string;
}

export function useCNPJEnrichment() {
  return useMutation<CNPJEnrichmentResponse, AxiosError<{ detail?: CNPJEnrichmentError }>, string>({
    mutationFn: async (cnpj: string) => {
      // Clean CNPJ (remove formatting) before sending
      const cleanedCNPJ = cleanCNPJ(cnpj);

      console.log('Enriching CNPJ:', cnpj, '→ cleaned:', cleanedCNPJ);
      console.log('Request URL:', `/invoices/cnpj/${cleanedCNPJ}/enrich`);

      try {
        const response = await apiClient.get<CNPJEnrichmentResponse>(
          `/invoices/cnpj/${cleanedCNPJ}/enrich`
        );
        console.log('Enrichment response:', response);
        return response;
      } catch (error) {
        console.error('Enrichment request failed:', error);
        throw error;
      }
    },
  });
}

export type { CNPJEnrichmentData, CNPJEnrichmentResponse, CNPJEnrichmentError };
