'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProcessingStatus, useConfirmInvoice } from '@/hooks/use-invoices';

interface InvoiceItem {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
}

interface ExtractedInvoiceData {
  access_key: string;
  number: string;
  series: string;
  issue_date: string;
  issuer_name: string;
  issuer_cnpj: string;
  total_value: number;
  items: InvoiceItem[];
  confidence: number;
  warnings: string[];
  image_count?: number;
}

export default function InvoiceReviewPage() {
  const params = useParams();
  const router = useRouter();
  const processingId = params.processingId as string;

  const { data: processingData, isLoading, error: fetchError } = useProcessingStatus(processingId);
  const confirmMutation = useConfirmInvoice();

  const [editedData, setEditedData] = useState<ExtractedInvoiceData | null>(null);
  const [duplicateError, setDuplicateError] = useState<{
    message: string;
    existingId?: string;
    existingNumber?: string;
    existingDate?: string;
    existingTotal?: number;
  } | null>(null);

  // Update editedData when processingData changes
  if (processingData?.extracted_data && !editedData) {
    // Ensure all numeric values are properly converted
    const cleanedData = {
      ...processingData.extracted_data,
      total_value: Number(processingData.extracted_data.total_value) || 0,
      confidence: Number(processingData.extracted_data.confidence) || 0,
      items: processingData.extracted_data.items?.map((item: any) => ({
        ...item,
        quantity: Number(item.quantity) || 0,
        unit_price: Number(item.unit_price) || 0,
        total_price: Number(item.total_price) || 0,
      })) || [],
    };
    setEditedData(cleanedData);
  }

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    if (!editedData) return;

    const newItems = [...editedData.items];

    // Convert to number if it's a numeric field
    if (field === 'quantity' || field === 'unit_price' || field === 'total_price') {
      const numValue = typeof value === 'string' ? parseFloat(value) || 0 : Number(value) || 0;
      newItems[index] = { ...newItems[index], [field]: numValue };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }

    // Recalculate total_price if quantity or unit_price changed
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = Number(newItems[index].quantity) || 0;
      const unitPrice = Number(newItems[index].unit_price) || 0;
      newItems[index].total_price = quantity * unitPrice;
    }

    // Recalculate total_value
    const newTotal = newItems.reduce((sum, item) => {
      return sum + (Number(item.total_price) || 0);
    }, 0);

    setEditedData({
      ...editedData,
      items: newItems,
      total_value: newTotal,
    });
  };

  const handleHeaderChange = (field: keyof ExtractedInvoiceData, value: string) => {
    if (!editedData) return;
    setEditedData({ ...editedData, [field]: value });
  };

  const handleConfirm = async () => {
    if (!editedData) return;

    try {
      await confirmMutation.mutateAsync({
        processingId,
        data: editedData,
      });
      router.push('/invoices');
    } catch (err: any) {
      // Check if it's a duplicate invoice error (409 Conflict)
      if (err?.response?.status === 409) {
        const detail = err?.response?.data?.detail;
        if (typeof detail === 'object') {
          setDuplicateError({
            message: detail.message || 'Esta nota fiscal já foi cadastrada',
            existingId: detail.existing_invoice_id,
            existingNumber: detail.existing_invoice_number,
            existingDate: detail.existing_invoice_date,
            existingTotal: detail.existing_invoice_total,
          });
        } else {
          setDuplicateError({
            message: detail || 'Esta nota fiscal já foi cadastrada',
          });
        }
      } else {
        alert(err?.response?.data?.detail || err.message || 'Falha ao salvar nota fiscal');
      }
    }
  };

  const handleCancel = () => {
    router.push('/invoices');
  };

  // Loading state - initial fetch
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-[#2d2d2d] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="font-mono text-sm text-[#666]">Carregando dados...</p>
        </div>
      </div>
    );
  }

  // Error state - only show if there's a real error AND we're not still processing
  if (fetchError) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">
            {String(fetchError)}
          </p>
          <button
            onClick={() => router.push('/invoices')}
            className="px-6 py-2 bg-[#2d2d2d] text-white font-mono text-sm hover:bg-[#1a1a1a] transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // Processing states - show spinner with status
  if (!processingData || processingData.status === 'pending' || processingData.status === 'processing') {
    const statusMessage =
      processingData?.status === 'processing'
        ? 'Processando nota fiscal com IA...'
        : processingData?.status === 'pending'
        ? 'Aguardando processamento...'
        : 'Carregando dados...';

    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-[#2d2d2d] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="font-mono text-sm text-[#666] mb-2">{statusMessage}</p>
          <p className="font-mono text-xs text-[#999]">
            Isso pode levar alguns segundos...
          </p>
        </div>
      </div>
    );
  }

  // Error status from backend
  if (processingData.status === 'error') {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="inline-block p-4 bg-red-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'Crimson Text, serif' }}>
            Erro no Processamento
          </h3>
          <p className="text-red-600 mb-4 font-mono text-sm">
            {processingData.errors?.length > 0
              ? processingData.errors.join(', ')
              : 'Não foi possível processar a nota fiscal'}
          </p>
          <button
            onClick={() => router.push('/invoices')}
            className="px-6 py-2 bg-[#2d2d2d] text-white font-mono text-sm hover:bg-[#1a1a1a] transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // Data not available after extraction
  if (!editedData) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Dados extraídos não disponíveis</p>
          <button
            onClick={() => router.push('/invoices')}
            className="px-6 py-2 bg-[#2d2d2d] text-white font-mono text-sm hover:bg-[#1a1a1a] transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const confidence = Number(editedData.confidence) || 0;

  const confidenceColor =
    confidence >= 0.9
      ? '#16a34a'
      : confidence >= 0.7
      ? '#f59e0b'
      : '#dc2626';

  const confidenceLabel =
    confidence >= 0.9
      ? 'ALTA CONFIANÇA'
      : confidence >= 0.7
      ? 'CONFIANÇA MÉDIA'
      : 'REVISAR COM ATENÇÃO';

  return (
    <div className="min-h-screen bg-[#faf9f7] py-8 px-4 sm:px-6 lg:px-8">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

        body {
          background: repeating-linear-gradient(
            0deg,
            #faf9f7 0px,
            #faf9f7 1px,
            transparent 1px,
            transparent 2px
          );
        }

        .receipt-texture {
          background-image:
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 24px,
              rgba(0, 0, 0, 0.02) 24px,
              rgba(0, 0, 0, 0.02) 25px
            );
        }

        .stamp-rotate {
          transform: rotate(-2deg);
        }

        .editable-cell {
          transition: all 0.2s ease;
        }

        .editable-cell:hover {
          background: rgba(45, 45, 45, 0.03);
        }

        .editable-cell:focus {
          outline: 2px solid #2d2d2d;
          outline-offset: -2px;
          background: white;
        }
      `}</style>

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Crimson Text, serif' }}>
            Revisar Nota Fiscal
          </h1>
          <p className="text-[#666] font-mono text-sm">
            Confirme os dados extraídos antes de salvar
          </p>
        </div>

        {/* Main Receipt Container */}
        <div className="bg-white shadow-lg receipt-texture border-2 border-[#e5e5e5] relative">
          {/* Confidence Stamp */}
          <div
            className="absolute top-6 right-6 stamp-rotate"
            style={{
              border: `3px solid ${confidenceColor}`,
              padding: '12px 20px',
              transform: 'rotate(-5deg)',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
            }}
          >
            <div
              className="font-mono text-xs font-bold tracking-wider"
              style={{ color: confidenceColor }}
            >
              {confidenceLabel}
            </div>
            <div
              className="font-mono text-2xl font-bold text-center mt-1"
              style={{ color: confidenceColor }}
            >
              {Math.round(confidence * 100)}%
            </div>
          </div>

          <div className="p-8 sm:p-12">
            {/* Image Count Badge */}
            {editedData.image_count && editedData.image_count > 1 && (
              <div className="inline-block mb-6 px-4 py-2 bg-[#2d2d2d] text-white font-mono text-xs">
                {editedData.image_count} IMAGENS PROCESSADAS
              </div>
            )}

            {/* Invoice Header Info */}
            <div className="border-b-2 border-dotted border-[#ccc] pb-8 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Issuer */}
                <div>
                  <label className="block text-xs font-mono text-[#666] mb-2 tracking-wider">
                    ESTABELECIMENTO
                  </label>
                  <input
                    type="text"
                    value={editedData.issuer_name}
                    onChange={(e) => handleHeaderChange('issuer_name', e.target.value)}
                    className="w-full font-mono text-lg font-semibold border-b-2 border-transparent hover:border-[#e5e5e5] focus:border-[#2d2d2d] px-2 py-1 transition-colors bg-transparent editable-cell"
                    style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                  />
                  <input
                    type="text"
                    value={editedData.issuer_cnpj}
                    onChange={(e) => handleHeaderChange('issuer_cnpj', e.target.value)}
                    className="w-full font-mono text-sm text-[#666] mt-1 border-b-2 border-transparent hover:border-[#e5e5e5] focus:border-[#2d2d2d] px-2 py-1 transition-colors bg-transparent editable-cell"
                    style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                  />
                </div>

                {/* Invoice Details */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-[#666] tracking-wider">NF-e Nº</span>
                    <input
                      type="text"
                      value={editedData.number}
                      onChange={(e) => handleHeaderChange('number', e.target.value)}
                      className="font-mono text-sm font-semibold text-right border-b-2 border-transparent hover:border-[#e5e5e5] focus:border-[#2d2d2d] px-2 py-1 transition-colors bg-transparent editable-cell"
                      style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-[#666] tracking-wider">SÉRIE</span>
                    <input
                      type="text"
                      value={editedData.series}
                      onChange={(e) => handleHeaderChange('series', e.target.value)}
                      className="font-mono text-sm font-semibold text-right border-b-2 border-transparent hover:border-[#e5e5e5] focus:border-[#2d2d2d] px-2 py-1 transition-colors bg-transparent editable-cell"
                      style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-[#666] tracking-wider">DATA</span>
                    <input
                      type="text"
                      value={
                        editedData.issue_date
                          ? new Date(editedData.issue_date).toLocaleString('pt-BR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''
                      }
                      onChange={(e) => handleHeaderChange('issue_date', e.target.value)}
                      className="font-mono text-sm font-semibold text-right border-b-2 border-transparent hover:border-[#e5e5e5] focus:border-[#2d2d2d] px-2 py-1 transition-colors bg-transparent editable-cell"
                      style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                    />
                  </div>
                </div>
              </div>

              {/* Access Key */}
              <div className="mt-6">
                <label className="block text-xs font-mono text-[#666] mb-2 tracking-wider">
                  CHAVE DE ACESSO
                </label>
                <input
                  type="text"
                  value={editedData.access_key}
                  onChange={(e) => handleHeaderChange('access_key', e.target.value)}
                  className="w-full font-mono text-xs text-[#666] tracking-wider border-b-2 border-transparent hover:border-[#e5e5e5] focus:border-[#2d2d2d] px-2 py-1 transition-colors bg-transparent editable-cell"
                  style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                />
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-8">
              <h2
                className="text-2xl font-bold mb-6"
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                Itens
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-[#2d2d2d]">
                      <th className="text-left py-3 px-2 font-mono text-xs tracking-wider text-[#666]">
                        DESCRIÇÃO
                      </th>
                      <th className="text-right py-3 px-2 font-mono text-xs tracking-wider text-[#666] w-24">
                        QTD
                      </th>
                      <th className="text-center py-3 px-2 font-mono text-xs tracking-wider text-[#666] w-16">
                        UN
                      </th>
                      <th className="text-right py-3 px-2 font-mono text-xs tracking-wider text-[#666] w-32">
                        PREÇO UN.
                      </th>
                      <th className="text-right py-3 px-2 font-mono text-xs tracking-wider text-[#666] w-32">
                        TOTAL
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {editedData.items.map((item, index) => (
                      <tr
                        key={index}
                        className="border-b border-dotted border-[#e5e5e5] hover:bg-[#faf9f7] transition-colors"
                      >
                        <td className="py-3 px-2">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              handleItemChange(index, 'description', e.target.value)
                            }
                            className="w-full font-mono text-sm border-b-2 border-transparent hover:border-[#e5e5e5] focus:border-[#2d2d2d] px-1 py-1 transition-colors bg-transparent editable-cell"
                            style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                          />
                        </td>
                        <td className="py-3 px-2">
                          <input
                            type="number"
                            step="0.001"
                            value={Number(item.quantity) || 0}
                            onChange={(e) =>
                              handleItemChange(index, 'quantity', e.target.value)
                            }
                            className="w-full font-mono text-sm text-right border-b-2 border-transparent hover:border-[#e5e5e5] focus:border-[#2d2d2d] px-1 py-1 transition-colors bg-transparent editable-cell"
                            style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                          />
                        </td>
                        <td className="py-3 px-2">
                          <input
                            type="text"
                            value={item.unit || ''}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                            className="w-full font-mono text-sm text-center border-b-2 border-transparent hover:border-[#e5e5e5] focus:border-[#2d2d2d] px-1 py-1 transition-colors bg-transparent editable-cell"
                            style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                          />
                        </td>
                        <td className="py-3 px-2">
                          <input
                            type="number"
                            step="0.01"
                            value={Number(item.unit_price) || 0}
                            onChange={(e) =>
                              handleItemChange(index, 'unit_price', e.target.value)
                            }
                            className="w-full font-mono text-sm text-right border-b-2 border-transparent hover:border-[#e5e5e5] focus:border-[#2d2d2d] px-1 py-1 transition-colors bg-transparent editable-cell"
                            style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                          />
                        </td>
                        <td className="py-3 px-2 font-mono text-sm text-right font-semibold">
                          R$ {(Number(item.total_price) || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total */}
            <div className="border-t-2 border-[#2d2d2d] pt-6 mb-8">
              <div className="flex justify-between items-center">
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

            {/* Warnings */}
            {editedData.warnings && editedData.warnings.length > 0 && (
              <div className="mb-8 p-6 bg-amber-50 border-l-4 border-amber-500">
                <h3 className="font-mono text-xs font-bold text-amber-800 mb-3 tracking-wider">
                  ⚠ AVISOS
                </h3>
                <ul className="space-y-2">
                  {editedData.warnings.map((warning, index) => (
                    <li key={index} className="font-mono text-sm text-amber-700">
                      • {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleConfirm}
                disabled={confirmMutation.isPending}
                className="flex-1 py-4 bg-[#2d2d2d] text-white font-mono text-sm font-semibold tracking-wider hover:bg-[#1a1a1a] transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {confirmMutation.isPending ? 'SALVANDO...' : 'CONFIRMAR E SALVAR'}
              </button>
              <button
                onClick={handleCancel}
                disabled={confirmMutation.isPending}
                className="flex-1 sm:flex-none px-8 py-4 border-2 border-[#2d2d2d] text-[#2d2d2d] font-mono text-sm font-semibold tracking-wider hover:bg-[#2d2d2d] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs font-mono text-[#999] mt-8">
          Clique nos campos para editar • Alterações são salvas ao confirmar
        </p>
      </div>

      {/* Duplicate Error Modal */}
      {duplicateError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-md w-full receipt-texture border-2 border-red-500 shadow-2xl">
            <div className="p-8">
              {/* Error Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>

              {/* Title */}
              <h2
                className="text-2xl font-bold text-center mb-4 text-red-600"
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                Nota Fiscal Duplicada
              </h2>

              {/* Message */}
              <p className="text-center font-mono text-sm text-gray-700 mb-6">
                {duplicateError.message}
              </p>

              {/* Existing Invoice Info */}
              {duplicateError.existingNumber && (
                <div className="bg-gray-50 p-4 mb-6 border-l-4 border-red-500">
                  <p className="font-mono text-xs text-gray-600 mb-2">NOTA EXISTENTE:</p>
                  <div className="space-y-1 font-mono text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Número:</span>
                      <span className="font-semibold">{duplicateError.existingNumber}</span>
                    </div>
                    {duplicateError.existingDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Data:</span>
                        <span className="font-semibold">
                          {new Date(duplicateError.existingDate).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    )}
                    {duplicateError.existingTotal !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total:</span>
                        <span className="font-semibold">
                          R$ {duplicateError.existingTotal.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setDuplicateError(null);
                    router.push('/invoices');
                  }}
                  className="w-full py-3 bg-[#2d2d2d] text-white font-mono text-sm font-semibold tracking-wider hover:bg-[#1a1a1a] transition-colors"
                >
                  VER TODAS AS NOTAS
                </button>
                <button
                  onClick={() => setDuplicateError(null)}
                  className="w-full py-3 border-2 border-[#2d2d2d] text-[#2d2d2d] font-mono text-sm font-semibold tracking-wider hover:bg-[#f5f5f5] transition-colors"
                >
                  FECHAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
