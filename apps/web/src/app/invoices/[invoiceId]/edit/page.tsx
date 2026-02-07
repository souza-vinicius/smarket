'use client';

import { useState, useEffect } from 'react';

import { useParams, useRouter } from 'next/navigation';

import { type AxiosError } from 'axios';

import { useInvoice, useUpdateInvoice } from '@/hooks/use-invoices';
import { type InvoiceItem, type InvoiceUpdateRequest } from '@/types';
import { formatCNPJInput, getCNPJErrorMessage, isValidCNPJ } from '@/lib/cnpj';
import { useCNPJEnrichment, type CNPJEnrichmentError } from '@/hooks/use-cnpj-enrichment';

interface EditableInvoice {
  issuer_name: string;
  issuer_cnpj: string;
  number: string;
  series: string;
  issue_date: string;
  access_key: string;
  total_value: number;
  items: InvoiceItem[];
}

export default function InvoiceEditPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.invoiceId as string;

  const { data: invoice, isLoading, error: fetchError } = useInvoice(invoiceId);
  const updateMutation = useUpdateInvoice();
  const enrichmentMutation = useCNPJEnrichment();

  const [editedData, setEditedData] = useState<EditableInvoice | null>(null);
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [enrichmentSuccess, setEnrichmentSuccess] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize editedData from fetched invoice
  useEffect(() => {
    if (invoice && !editedData) {
      const items: InvoiceItem[] = (invoice.items ?? invoice.products ?? []).map((item) => ({
        code: item.code || '',
        description: item.description || '',
        quantity: Number(item.quantity) || 0,
        unit: item.unit || 'UN',
        unit_price: Number(item.unit_price) || 0,
        total_price: Number(item.total_price) || 0,
        category_name: item.category_name || '',
        subcategory: item.subcategory || '',
      }));

      setEditedData({
        issuer_name: invoice.issuer_name || '',
        issuer_cnpj: invoice.issuer_cnpj ? formatCNPJInput(invoice.issuer_cnpj) : '',
        number: invoice.number || '',
        series: invoice.series || '',
        issue_date: invoice.issue_date
          ? new Date(invoice.issue_date).toISOString().slice(0, 16)
          : '',
        access_key: invoice.access_key || '',
        total_value: Number(invoice.total_value) || 0,
        items,
      });
    }
  }, [invoice, editedData]);

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    if (!editedData) { return; }

    const newItems = [...editedData.items];

    if (field === 'quantity' || field === 'unit_price' || field === 'total_price') {
      const numValue = typeof value === 'string' ? parseFloat(value) || 0 : Number(value) || 0;
      // eslint-disable-next-line security/detect-object-injection
      newItems[index] = { ...newItems[index], [field]: numValue };
    } else {
      // eslint-disable-next-line security/detect-object-injection
      newItems[index] = { ...newItems[index], [field]: value };
    }

    if (field === 'quantity' || field === 'unit_price') {
      // eslint-disable-next-line security/detect-object-injection
      const quantity = Number(newItems[index].quantity) || 0;
      // eslint-disable-next-line security/detect-object-injection
      const unitPrice = Number(newItems[index].unit_price) || 0;
      // eslint-disable-next-line security/detect-object-injection
      newItems[index].total_price = quantity * unitPrice;
    }

    const newTotal = newItems.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);

    setEditedData({
      ...editedData,
      items: newItems,
      total_value: newTotal,
    });
  };

  const handleHeaderChange = (field: keyof EditableInvoice, value: string) => {
    if (!editedData) { return; }

    if (field === 'issuer_cnpj') {
      const formatted = formatCNPJInput(value);
      setEditedData({ ...editedData, [field]: formatted });
      const error = getCNPJErrorMessage(formatted);
      setCnpjError(error);
      setValidationError(null);
    } else {
      setEditedData({ ...editedData, [field]: value });
    }
  };

  const handleAddItem = () => {
    if (!editedData) { return; }
    const newItems = [...editedData.items, {
      code: '',
      description: '',
      quantity: 1,
      unit: 'UN',
      unit_price: 0,
      total_price: 0,
      category_name: '',
      subcategory: '',
    }];
    const newTotal = newItems.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
    setEditedData({ ...editedData, items: newItems, total_value: newTotal });
  };

  const handleRemoveItem = (index: number) => {
    if (!editedData || editedData.items.length <= 1) { return; }
    const newItems = editedData.items.filter((_, i) => i !== index);
    const newTotal = newItems.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
    setEditedData({ ...editedData, items: newItems, total_value: newTotal });
  };

  const handleUseItemsSum = () => {
    if (!editedData) { return; }
    setEditedData({ ...editedData, total_value: itemsSum });
  };

  const handleEnrichCNPJ = async () => {
    if (!editedData?.issuer_cnpj) {
      setValidationError('CNPJ não informado');
      return;
    }

    const cnpjValidationError = getCNPJErrorMessage(editedData.issuer_cnpj);
    if (cnpjValidationError) {
      setCnpjError(cnpjValidationError);
      setValidationError('Por favor, corrija o CNPJ antes de consultar.');
      return;
    }

    setEnrichmentSuccess(null);
    setValidationError(null);

    try {
      const result = await enrichmentMutation.mutateAsync(editedData.issuer_cnpj);

      if (result.suggested_name && editedData) {
        setEditedData({
          ...editedData,
          issuer_name: result.suggested_name,
        });
        setEnrichmentSuccess(
          `Nome atualizado com sucesso! Fonte: ${result.data.source === 'brasilapi' ? 'BrasilAPI' : 'ReceitaWS'}`
        );
      }
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: CNPJEnrichmentError }>;
      const detail = axiosError?.response?.data?.detail;

      if (detail) {
        setValidationError(detail.hint ? `${detail.message}\n${detail.hint}` : detail.message || 'Erro ao consultar CNPJ');
      } else {
        setValidationError(axiosError?.message || 'Erro ao consultar CNPJ. Tente novamente.');
      }
    }
  };

  const handleSave = async () => {
    if (!editedData) { return; }

    if (editedData.issuer_cnpj) {
      const cnpjValidationError = getCNPJErrorMessage(editedData.issuer_cnpj);
      if (cnpjValidationError) {
        setCnpjError(cnpjValidationError);
        setValidationError('Por favor, corrija os erros antes de salvar.');
        return;
      }
    }

    try {
      const updateData: InvoiceUpdateRequest = {
        number: editedData.number,
        series: editedData.series,
        issue_date: editedData.issue_date
          ? new Date(editedData.issue_date).toISOString()
          : undefined,
        issuer_name: editedData.issuer_name,
        issuer_cnpj: editedData.issuer_cnpj,
        total_value: editedData.total_value,
        access_key: editedData.access_key,
        items: editedData.items.map((item) => ({
          code: item.code || '',
          description: item.description,
          quantity: Number(item.quantity) || 0,
          unit: item.unit || 'UN',
          unit_price: Number(item.unit_price) || 0,
          total_price: Number(item.total_price) || 0,
          category_name: item.category_name || undefined,
          subcategory: item.subcategory || undefined,
        })),
      };

      await updateMutation.mutateAsync({ id: invoiceId, data: updateData });
      setSaveSuccess(true);
      setTimeout(() => {
        router.push(`/invoices/${invoiceId}`);
      }, 800);
    } catch (err) {
      const axiosError = err as AxiosError<{
        detail?: {
          error?: string;
          message?: string;
          field?: string;
        } | string;
      }>;

      if (axiosError.response?.status === 400) {
        const detail = axiosError?.response?.data?.detail;
        if (typeof detail === 'object' && detail !== null && detail.error === 'invalid_cnpj') {
          setCnpjError(detail.message || 'CNPJ inválido');
          setValidationError('Verifique o CNPJ informado.');
          return;
        }
      }

      if (axiosError.response?.status === 409) {
        const detail = axiosError?.response?.data?.detail;
        const message = typeof detail === 'object' && detail !== null
          ? detail.message || 'Conflito ao salvar'
          : (typeof detail === 'string' ? detail : 'Conflito ao salvar');
        setValidationError(message);
      } else {
        const errorMessage = typeof axiosError?.response?.data?.detail === 'object'
          ? axiosError.response.data.detail.message
          : axiosError?.response?.data?.detail || axiosError.message || 'Falha ao salvar alterações';
        alert(errorMessage);
      }
    }
  };

  const handleCancel = () => {
    router.push(`/invoices/${invoiceId}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf9f7]">
        <div className="text-center">
          <div className="mb-4 inline-block size-8 animate-spin rounded-full border-2 border-[#2d2d2d] border-t-transparent" />
          <p className="font-mono text-sm text-[#666]">Carregando dados...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (fetchError || !invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf9f7]">
        <div className="text-center">
          <p className="mb-4 text-red-600">Nota fiscal não encontrada</p>
          <button
            onClick={() => { router.push('/invoices'); }}
            className="bg-[#2d2d2d] px-6 py-2 font-mono text-sm text-white transition-colors hover:bg-[#1a1a1a]"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (!editedData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf9f7]">
        <div className="text-center">
          <div className="mb-4 inline-block size-8 animate-spin rounded-full border-2 border-[#2d2d2d] border-t-transparent" />
          <p className="font-mono text-sm text-[#666]">Preparando edição...</p>
        </div>
      </div>
    );
  }

  const itemsSum = editedData.items.reduce(
    (sum, item) => sum + (Number(item.total_price) || 0), 0
  );
  const totalMismatch = Math.abs(itemsSum - Number(editedData.total_value)) > 0.01;

  const isFieldEmpty = (value: string | undefined | null): boolean =>
    !value || value.trim() === '';

  const accessKeyDigits = (editedData.access_key || '').replace(/\D/g, '');
  const accessKeyValid = accessKeyDigits.length === 44;

  const fieldHighlight = (value: string | undefined | null): string =>
    isFieldEmpty(value)
      ? 'border-amber-400 bg-amber-50/50'
      : 'border-transparent';

  return (
    <div className="min-h-screen bg-[#faf9f7] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Receipt Container */}
        <div className="receipt-texture relative overflow-hidden rounded-none border border-[#e5e5e5] bg-[#faf9f7] shadow-xl">
          {/* Edit Mode Badge */}
          <div
            className="absolute right-6 top-6"
            style={{
              border: '3px solid #2d2d2d',
              padding: '12px 20px',
              transform: 'rotate(-5deg)',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
            }}
          >
            <div className="font-mono text-xs font-bold tracking-wider text-[#2d2d2d]">
              MODO EDIÇÃO
            </div>
          </div>

          <div className="p-8 sm:p-12">
            {/* Page Title */}
            <div className="mb-8 border-b-2 border-[#2d2d2d] pb-4">
              <h1
                className="text-3xl font-bold text-[#2d2d2d]"
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                Editar Nota Fiscal
              </h1>
              <p className="mt-1 font-mono text-xs text-[#999]">
                NF-e nº {invoice.number} · {invoice.issuer_name}
              </p>
            </div>

            {/* Save Success Message */}
            {saveSuccess && (
              <div className="mb-6 border-l-4 border-green-500 bg-green-50 p-4">
                <p className="font-mono text-sm text-green-700">
                  ✓ Alterações salvas com sucesso! Redirecionando...
                </p>
              </div>
            )}

            {/* Invoice Header Info */}
            <div className="mb-8 border-b-2 border-dotted border-[#ccc] pb-8">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Issuer */}
                <div>
                  <label htmlFor="issuer-name" className="mb-2 block font-mono text-xs tracking-wider text-[#666]">
                    ESTABELECIMENTO
                  </label>
                  <input
                    id="issuer-name"
                    type="text"
                    value={editedData.issuer_name}
                    onChange={(e) => { handleHeaderChange('issuer_name', e.target.value); }}
                    className={`editable-cell w-full border-b-2 bg-transparent px-2 py-1 font-mono text-lg font-semibold transition-colors hover:border-[#e5e5e5] focus:border-[#2d2d2d] ${fieldHighlight(editedData.issuer_name)}`}
                    style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                    placeholder="Nome do estabelecimento"
                  />
                  <div className="mt-1">
                    <label htmlFor="issuer-cnpj" className="mb-1 block font-mono text-xs tracking-wider text-[#666]">
                      CNPJ
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="issuer-cnpj"
                        type="text"
                        value={editedData.issuer_cnpj}
                        onChange={(e) => { handleHeaderChange('issuer_cnpj', e.target.value); }}
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                        className={`editable-cell flex-1 border-b-2 bg-transparent px-2 py-1 font-mono text-sm transition-colors ${cnpjError
                          ? 'border-red-500 text-red-600 focus:border-red-600'
                          : 'border-transparent text-[#666] hover:border-[#e5e5e5] focus:border-[#2d2d2d]'
                          }`}
                        style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                      />
                      <button
                        onClick={() => { void handleEnrichCNPJ(); }}
                        disabled={enrichmentMutation.isPending || !!cnpjError || !editedData.issuer_cnpj}
                        className="shrink-0 border border-[#2d2d2d] bg-white px-3 py-1 font-mono text-xs font-semibold tracking-wider text-[#2d2d2d] transition-all hover:bg-[#2d2d2d] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-[#2d2d2d]"
                        title="Consultar dados do CNPJ na Receita Federal"
                      >
                        {enrichmentMutation.isPending ? '...' : '🔍'}
                      </button>
                    </div>
                    {cnpjError && (
                      <p className="mt-1 font-mono text-xs text-red-600">
                        {cnpjError}
                      </p>
                    )}
                    {enrichmentSuccess && (
                      <p className="mt-1 font-mono text-xs text-green-600">
                        ✓ {enrichmentSuccess}
                      </p>
                    )}
                    {!cnpjError && !enrichmentSuccess && editedData.issuer_cnpj && isValidCNPJ(editedData.issuer_cnpj) && (
                      <p className="mt-1 font-mono text-xs text-green-600">
                        ✓ CNPJ válido
                      </p>
                    )}
                  </div>
                </div>

                {/* Invoice Details */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs tracking-wider text-[#666]">NF-e Nº</span>
                    <input
                      type="text"
                      value={editedData.number}
                      onChange={(e) => { handleHeaderChange('number', e.target.value); }}
                      className={`editable-cell border-b-2 bg-transparent px-2 py-1 text-right font-mono text-sm font-semibold transition-colors hover:border-[#e5e5e5] focus:border-[#2d2d2d] ${fieldHighlight(editedData.number)}`}
                      style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                      placeholder="Nº da nota"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs tracking-wider text-[#666]">SÉRIE</span>
                    <input
                      type="text"
                      value={editedData.series}
                      onChange={(e) => { handleHeaderChange('series', e.target.value); }}
                      className="editable-cell border-b-2 border-transparent bg-transparent px-2 py-1 text-right font-mono text-sm font-semibold transition-colors hover:border-[#e5e5e5] focus:border-[#2d2d2d]"
                      style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs tracking-wider text-[#666]">DATA</span>
                    <input
                      type="datetime-local"
                      value={editedData.issue_date}
                      onChange={(e) => { handleHeaderChange('issue_date', e.target.value); }}
                      className="editable-cell border-b-2 border-transparent bg-transparent px-2 py-1 text-right font-mono text-sm font-semibold transition-colors hover:border-[#e5e5e5] focus:border-[#2d2d2d]"
                      style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                    />
                  </div>
                </div>
              </div>

              {/* Access Key */}
              <div className="mt-6">
                <label htmlFor="access-key" className="mb-2 block font-mono text-xs tracking-wider text-[#666]">
                  CHAVE DE ACESSO
                  {!isFieldEmpty(editedData.access_key) && !accessKeyValid && (
                    <span className="ml-2 text-amber-600">
                      ({accessKeyDigits.length}/44 dígitos)
                    </span>
                  )}
                </label>
                <input
                  id="access-key"
                  type="text"
                  value={editedData.access_key}
                  onChange={(e) => { handleHeaderChange('access_key', e.target.value); }}
                  className={`editable-cell w-full border-b-2 bg-transparent px-2 py-1 font-mono text-xs tracking-wider transition-colors hover:border-[#e5e5e5] focus:border-[#2d2d2d] ${
                    isFieldEmpty(editedData.access_key)
                      ? 'border-amber-400 bg-amber-50/50 text-amber-700'
                      : !accessKeyValid
                        ? 'border-amber-400 text-amber-700'
                        : 'border-transparent text-[#666]'
                  }`}
                  style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                  placeholder="44 dígitos — chave de acesso da nota fiscal"
                />
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-8">
              <h2
                className="mb-6 text-2xl font-bold"
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                Itens
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-[#2d2d2d]">
                      <th className="w-16 px-2 py-3 text-left font-mono text-xs tracking-wider text-[#666]">
                        CÓD
                      </th>
                      <th className="px-2 py-3 text-left font-mono text-xs tracking-wider text-[#666]">
                        DESCRIÇÃO
                      </th>
                      <th className="w-24 px-2 py-3 text-right font-mono text-xs tracking-wider text-[#666]">
                        QTD
                      </th>
                      <th className="w-16 px-2 py-3 text-center font-mono text-xs tracking-wider text-[#666]">
                        UN
                      </th>
                      <th className="w-24 px-2 py-3 text-left font-mono text-xs tracking-wider text-[#666]">
                        CATEGORIA
                      </th>
                      <th className="w-24 px-2 py-3 text-left font-mono text-xs tracking-wider text-[#666]">
                        SUBCATEGORIA
                      </th>
                      <th className="w-32 px-2 py-3 text-right font-mono text-xs tracking-wider text-[#666]">
                        PREÇO UN.
                      </th>
                      <th className="w-32 px-2 py-3 text-right font-mono text-xs tracking-wider text-[#666]">
                        TOTAL
                      </th>
                      <th className="w-10 px-1 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {editedData.items.map((item, index) => (
                      <tr
                        key={`${String(index)}-${item.description}`}
                        className="border-b border-dotted border-[#e5e5e5] transition-colors hover:bg-[#faf9f7]"
                      >
                        <td className="px-2 py-3">
                          <input
                            type="text"
                            value={item.code || ''}
                            onChange={(e) => { handleItemChange(index, 'code' as keyof InvoiceItem, e.target.value); }}
                            className="editable-cell w-full border-b-2 border-transparent bg-transparent p-1 font-mono text-xs text-[#999] transition-colors hover:border-[#e5e5e5] focus:border-[#2d2d2d]"
                            style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                            placeholder="-"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => { handleItemChange(index, 'description', e.target.value); }}
                            className="editable-cell w-full border-b-2 border-transparent bg-transparent p-1 font-mono text-sm transition-colors hover:border-[#e5e5e5] focus:border-[#2d2d2d]"
                            style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                          />
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="number"
                            step="0.001"
                            value={Number(item.quantity) || 0}
                            onChange={(e) => { handleItemChange(index, 'quantity', e.target.value); }}
                            className="editable-cell w-full border-b-2 border-transparent bg-transparent p-1 text-right font-mono text-sm transition-colors hover:border-[#e5e5e5] focus:border-[#2d2d2d]"
                            style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                          />
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="text"
                            value={item.unit || ''}
                            onChange={(e) => { handleItemChange(index, 'unit', e.target.value); }}
                            className="editable-cell w-full border-b-2 border-transparent bg-transparent p-1 text-center font-mono text-sm transition-colors hover:border-[#e5e5e5] focus:border-[#2d2d2d]"
                            style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                          />
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="text"
                            value={item.category_name || ''}
                            onChange={(e) => { handleItemChange(index, 'category_name', e.target.value); }}
                            className="editable-cell w-full border-b-2 border-transparent bg-transparent p-1 font-mono text-sm transition-colors hover:border-[#e5e5e5] focus:border-[#2d2d2d]"
                            style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                            placeholder="-"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="text"
                            value={item.subcategory || ''}
                            onChange={(e) => { handleItemChange(index, 'subcategory', e.target.value); }}
                            className="editable-cell w-full border-b-2 border-transparent bg-transparent p-1 font-mono text-sm transition-colors hover:border-[#e5e5e5] focus:border-[#2d2d2d]"
                            style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                            placeholder="-"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={Number(item.unit_price) || 0}
                            onChange={(e) => { handleItemChange(index, 'unit_price', e.target.value); }}
                            className="editable-cell w-full border-b-2 border-transparent bg-transparent p-1 text-right font-mono text-sm transition-colors hover:border-[#e5e5e5] focus:border-[#2d2d2d]"
                            style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                          />
                        </td>
                        <td className="px-2 py-3 text-right font-mono text-sm font-semibold">
                          <span className="inline-flex items-center gap-1">
                            R$ {(Number(item.total_price) || 0).toFixed(2)}
                            {Math.abs((Number(item.quantity) || 0) * (Number(item.unit_price) || 0) - (Number(item.total_price) || 0)) > 0.02 && Number(item.total_price) > 0 && (
                              <span title="Total recalculado (qtd × preço unitário)" className="text-amber-500">⟳</span>
                            )}
                          </span>
                        </td>
                        <td className="px-1 py-3 text-center">
                          {editedData.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => { handleRemoveItem(index); }}
                              className="rounded p-1 text-[#999] transition-colors hover:bg-red-50 hover:text-red-500"
                              title="Remover item"
                            >
                              ×
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Item Button */}
              <button
                type="button"
                onClick={handleAddItem}
                className="mt-4 w-full border-2 border-dashed border-[#ccc] py-3 font-mono text-xs tracking-wider text-[#999] transition-colors hover:border-[#2d2d2d] hover:text-[#2d2d2d]"
              >
                + ADICIONAR ITEM
              </button>
            </div>

            {/* Sum Mismatch Banner */}
            {totalMismatch && (
              <div className="mb-4 border-l-4 border-amber-500 bg-amber-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-mono text-xs font-bold tracking-wider text-amber-800">
                      ⚠ DIVERGÊNCIA DE VALORES
                    </p>
                    <p className="mt-1 font-mono text-sm text-amber-700">
                      Soma dos itens: R$ {itemsSum.toFixed(2)} ≠ Total: R$ {(Number(editedData.total_value) || 0).toFixed(2)}
                      <span className="ml-2 text-amber-500">
                        (dif: R$ {Math.abs(itemsSum - Number(editedData.total_value)).toFixed(2)})
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseItemsSum}
                    className="shrink-0 border border-amber-600 bg-white px-4 py-2 font-mono text-xs font-semibold tracking-wider text-amber-700 transition-colors hover:bg-amber-600 hover:text-white"
                  >
                    USAR SOMA DOS ITENS
                  </button>
                </div>
              </div>
            )}

            {/* Total */}
            <div className="mb-8 border-t-2 border-[#2d2d2d] pt-6">
              <div className="flex items-center justify-between">
                <span
                  className="text-2xl font-bold"
                  style={{ fontFamily: 'Crimson Text, serif' }}
                >
                  Total
                </span>
                <span
                  className="font-mono text-3xl font-bold"
                  style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                >
                  R$ {(Number(editedData.total_value) || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Validation Error Message */}
            {validationError && (
              <div className="mb-6 border-l-4 border-red-500 bg-red-50 p-4">
                <p className="font-mono text-sm text-red-700">
                  ⚠ {validationError}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <button
                onClick={() => { void handleSave(); }}
                disabled={updateMutation.isPending || !!cnpjError || saveSuccess}
                className="flex-1 transform bg-[#2d2d2d] py-4 font-mono text-sm font-semibold tracking-wider text-white transition-all hover:scale-[1.02] hover:bg-[#1a1a1a] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                title={cnpjError ? 'Corrija os erros antes de salvar' : ''}
              >
                {updateMutation.isPending ? 'SALVANDO...' : saveSuccess ? '✓ SALVO!' : 'SALVAR ALTERAÇÕES'}
              </button>
              <button
                onClick={handleCancel}
                disabled={updateMutation.isPending}
                className="flex-1 border-2 border-[#2d2d2d] px-8 py-4 font-mono text-sm font-semibold tracking-wider text-[#2d2d2d] transition-all hover:bg-[#2d2d2d] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="mt-8 text-center font-mono text-xs text-[#999]">
          Clique nos campos para editar • Alterações são salvas ao clicar em &quot;Salvar Alterações&quot;
        </p>
      </div>
    </div>
  );
}
