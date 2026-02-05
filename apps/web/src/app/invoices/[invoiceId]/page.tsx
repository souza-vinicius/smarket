'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Trash2, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvoice, useDeleteInvoice } from '@/hooks/use-invoices';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useState } from 'react';

export default function InvoiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.invoiceId as string;

  const { data: invoice, isLoading, error } = useInvoice(invoiceId);
  const deleteInvoice = useDeleteInvoice();
  const [showAccessKey, setShowAccessKey] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!invoice) return;
    if (!confirm('Tem certeza que deseja deletar esta nota fiscal?')) return;

    setDeletingId(invoiceId);
    deleteInvoice.mutate(invoiceId, {
      onSuccess: () => {
        router.push('/invoices');
      },
      onError: () => {
        setDeletingId(null);
        alert('Erro ao deletar nota fiscal');
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 pl-64">
          <Header title="Detalhes da Nota Fiscal" />
          <main className="p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 pl-64">
          <Header title="Detalhes da Nota Fiscal" />
          <main className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                <p className="text-red-600 mb-4">Nota fiscal não encontrada</p>
                <Button
                  variant="primary"
                  onClick={() => router.push('/invoices')}
                >
                  Voltar para Notas Fiscais
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const sourceLabel = {
    qrcode: 'QR Code',
    xml: 'XML',
    pdf: 'PDF',
    manual: 'Manual',
    photo: 'Foto',
  }[invoice.source] || invoice.source;

  const sourceColor = {
    qrcode: 'bg-blue-100 text-blue-800',
    xml: 'bg-purple-100 text-purple-800',
    pdf: 'bg-red-100 text-red-800',
    manual: 'bg-gray-100 text-gray-800',
    photo: 'bg-emerald-100 text-emerald-800',
  }[invoice.source] || 'bg-slate-100 text-slate-800';

  const subtotal = invoice.items?.reduce((sum, item) => {
    const totalPrice = typeof item.total_price === 'string'
      ? parseFloat(item.total_price)
      : Number(item.total_price) || 0;
    return sum + totalPrice;
  }, 0) || 0;
  const discount = 0; // TODO: get from invoice data
  const tax = 0; // TODO: get from invoice data

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 pl-64">
        <Header
          title="Detalhes da Nota Fiscal"
          subtitle={`NF-e nº ${invoice.number} · Série ${invoice.series}`}
        />

        <main className="p-6">
          <div className="max-w-4xl mx-auto">
            {/* Back Button and Actions */}
            <div className="mb-6 flex items-center justify-between">
              <button
                onClick={() => router.push('/invoices')}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Download className="h-4 w-4" />}
                  disabled
                >
                  Exportar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  onClick={handleDelete}
                  disabled={deletingId === invoiceId}
                  className="hover:text-red-600 hover:border-red-300"
                >
                  {deletingId === invoiceId ? 'Deletando...' : 'Deletar'}
                </Button>
              </div>
            </div>

            {/* Main Invoice Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Header Section with Source Badge */}
              <div className="border-b border-slate-200 p-8 bg-gradient-to-br from-slate-50 to-white">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                      {invoice.issuer_name}
                    </h1>
                    <p className="text-slate-600 font-mono text-sm">
                      CNPJ: {invoice.issuer_cnpj}
                    </p>
                  </div>
                  <Badge variant="outline" className={sourceColor}>
                    {sourceLabel}
                  </Badge>
                </div>

                {/* Key Metadata */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-1">
                      Data
                    </p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatDate(invoice.issue_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-1">
                      Tipo
                    </p>
                    <p className="text-lg font-semibold text-slate-900">
                      {invoice.invoice_type}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-1">
                      Número
                    </p>
                    <p className="text-lg font-semibold text-slate-900 font-mono">
                      {invoice.number}/{invoice.series}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-1">
                      Status
                    </p>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                      <span className="text-lg font-semibold text-emerald-600">
                        Processada
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Access Key Section */}
              <div className="border-b border-slate-200 px-8 py-6 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-2">
                      Chave de Acesso
                    </p>
                    <p
                      className="text-sm font-mono text-slate-600 tracking-wider break-all"
                      style={{
                        opacity: showAccessKey ? 1 : 0.5,
                        letterSpacing: '0.1em',
                      }}
                    >
                      {showAccessKey
                        ? invoice.access_key
                        : '••••••••••••••••••••••••••••••••••••••••••'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAccessKey(!showAccessKey)}
                    className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                    title={showAccessKey ? 'Ocultar' : 'Mostrar'}
                  >
                    {showAccessKey ? (
                      <EyeOff className="h-5 w-5 text-slate-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-slate-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Items Section */}
              <div className="border-b border-slate-200 p-8">
                <h2 className="text-xl font-bold text-slate-900 mb-6">Itens</h2>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-slate-200">
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 text-sm">
                          Descrição
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-700 text-sm w-24">
                          Qtd
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-slate-700 text-sm w-20">
                          Un
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-700 text-sm w-32">
                          Preço Un.
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-700 text-sm w-32">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items && invoice.items.length > 0 ? (
                        invoice.items.map((item, idx) => (
                          <tr
                            key={item.id}
                            className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                              idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                            }`}
                          >
                            <td className="py-4 px-4 text-slate-900">{item.description}</td>
                            <td className="py-4 px-4 text-right font-mono text-slate-900">
                              {(Number(item.quantity) || 0).toFixed(3)}
                            </td>
                            <td className="py-4 px-4 text-center text-slate-700">
                              {item.unit || ''}
                            </td>
                            <td className="py-4 px-4 text-right font-mono text-slate-900">
                              R$ {(Number(item.unit_price) || 0).toFixed(2)}
                            </td>
                            <td className="py-4 px-4 text-right font-mono font-semibold text-slate-900">
                              R$ {(Number(item.total_price) || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            Nenhum item encontrado
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary Section */}
              <div className="p-8 bg-gradient-to-br from-slate-50 to-white">
                <div className="max-w-sm ml-auto space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-mono font-semibold text-slate-900">
                      R$ {(subtotal || 0).toFixed(2)}
                    </span>
                  </div>

                  {(discount || 0) > 0 && (
                    <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                      <span className="text-slate-600">Desconto</span>
                      <span className="font-mono font-semibold text-red-600">
                        -R$ {(discount || 0).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {(tax || 0) > 0 && (
                    <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                      <span className="text-slate-600">Impostos</span>
                      <span className="font-mono font-semibold text-slate-900">
                        R$ {(tax || 0).toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-4">
                    <span className="text-lg font-bold text-slate-900">Total</span>
                    <span className="text-3xl font-bold font-mono text-emerald-600">
                      R$ {formatCurrency(invoice.total_value).replace('R$ ', '')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Info Section */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Imported From */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
                  Origem dos Dados
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 text-sm">Fonte</span>
                    <span className="font-mono text-slate-900">{sourceLabel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 text-sm">Criado em</span>
                    <span className="font-mono text-slate-900 text-sm">
                      {formatDate(invoice.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Invoice Type Info */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
                  Informações Adicionais
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 text-sm">Tipo de NF</span>
                    <Badge variant="outline">{invoice.invoice_type}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 text-sm">ID</span>
                    <span className="font-mono text-slate-900 text-xs truncate ml-2">
                      {invoice.id}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
