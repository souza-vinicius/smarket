'use client';

import { useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import { ArrowLeft, Download, Trash2, CheckCircle, Eye, EyeOff } from 'lucide-react';

import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvoice, useDeleteInvoice } from '@/hooks/use-invoices';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function InvoiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.invoiceId as string;

  const { data: invoice, isLoading, error } = useInvoice(invoiceId);
  const deleteInvoice = useDeleteInvoice();
  const [showAccessKey, setShowAccessKey] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!invoice) { return; }
    if (!confirm('Tem certeza que deseja deletar esta nota fiscal?')) { return; }

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
            <div className="mx-auto max-w-4xl space-y-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={`skeleton-${String(i)}`} className="h-24 w-full rounded-lg" />
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
            <div className="mx-auto max-w-4xl">
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <p className="mb-4 text-red-600">Nota fiscal não encontrada</p>
                <Button
                  variant="primary"
                  onClick={() => { router.push('/invoices'); }}
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
    image: 'Imagem',
  }[invoice.source] || invoice.source;

  const sourceColor = {
    qrcode: 'bg-blue-100 text-blue-800',
    xml: 'bg-purple-100 text-purple-800',
    pdf: 'bg-red-100 text-red-800',
    manual: 'bg-gray-100 text-gray-800',
    photo: 'bg-emerald-100 text-emerald-800',
    image: 'bg-emerald-100 text-emerald-800',
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
          <div className="mx-auto max-w-4xl">
            {/* Back Button and Actions */}
            <div className="mb-6 flex items-center justify-between">
              <button
                onClick={() => { router.push('/invoices'); }}
                className="flex items-center gap-2 font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                <ArrowLeft className="size-4" />
                Voltar
              </button>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Download className="size-4" />}
                  disabled
                >
                  Exportar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Trash2 className="size-4" />}
                  onClick={() => { void handleDelete(); }}
                  disabled={deletingId === invoiceId}
                  className="hover:border-red-300 hover:text-red-600"
                >
                  {deletingId === invoiceId ? 'Deletando...' : 'Deletar'}
                </Button>
              </div>
            </div>

            {/* Main Invoice Card */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {/* Header Section with Source Badge */}
              <div className="border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8">
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <h1 className="mb-2 text-3xl font-bold text-slate-900">
                      {invoice.issuer_name}
                    </h1>
                    <p className="font-mono text-sm text-slate-600">
                      CNPJ: {invoice.issuer_cnpj}
                    </p>
                  </div>
                  <Badge variant="outline" className={sourceColor}>
                    {sourceLabel}
                  </Badge>
                </div>

                {/* Key Metadata */}
                <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                  <div>
                    <p className="mb-1 font-mono text-xs uppercase tracking-wider text-slate-500">
                      Data
                    </p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatDate(invoice.issue_date)}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 font-mono text-xs uppercase tracking-wider text-slate-500">
                      Tipo
                    </p>
                    <p className="text-lg font-semibold text-slate-900">
                      {invoice.type}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 font-mono text-xs uppercase tracking-wider text-slate-500">
                      Número
                    </p>
                    <p className="font-mono text-lg font-semibold text-slate-900">
                      {invoice.number}/{invoice.series}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 font-mono text-xs uppercase tracking-wider text-slate-500">
                      Status
                    </p>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="size-5 text-emerald-600" />
                      <span className="text-lg font-semibold text-emerald-600">
                        Processada
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Access Key Section */}
              <div className="border-b border-slate-200 bg-slate-50 px-8 py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="mb-2 font-mono text-xs uppercase tracking-wider text-slate-500">
                      Chave de Acesso
                    </p>
                    <p
                      className="break-all font-mono text-sm tracking-wider text-slate-600"
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
                    onClick={() => { setShowAccessKey(!showAccessKey); }}
                    className="rounded-lg p-2 transition-colors hover:bg-slate-200"
                    title={showAccessKey ? 'Ocultar' : 'Mostrar'}
                  >
                    {showAccessKey ? (
                      <EyeOff className="size-5 text-slate-600" />
                    ) : (
                      <Eye className="size-5 text-slate-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Items Section */}
              <div className="border-b border-slate-200 p-8">
                <h2 className="mb-6 text-xl font-bold text-slate-900">Itens</h2>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-slate-200">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                          Descrição
                        </th>
                        <th className="w-24 px-4 py-3 text-right text-sm font-semibold text-slate-700">
                          Qtd
                        </th>
                        <th className="w-20 px-4 py-3 text-center text-sm font-semibold text-slate-700">
                          Un
                        </th>
                        <th className="w-24 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                          Categoria
                        </th>
                        <th className="w-24 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                          Subcategoria
                        </th>
                        <th className="w-32 px-4 py-3 text-right text-sm font-semibold text-slate-700">
                          Preço Un.
                        </th>
                        <th className="w-32 px-4 py-3 text-right text-sm font-semibold text-slate-700">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items && invoice.items.length > 0 ? (
                        invoice.items.map((item, idx) => (
                          <tr
                            key={item.id}
                            className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                              }`}
                          >
                            <td className="p-4 text-slate-900">{item.description}</td>
                            <td className="p-4 text-right font-mono text-slate-900">
                              {(Number(item.quantity) || 0).toFixed(3)}
                            </td>
                            <td className="p-4 text-center text-slate-700">
                              {item.unit || ''}
                            </td>
                            <td className="p-4 text-slate-700">
                              {item.category_name || '-'}
                            </td>
                            <td className="p-4 text-slate-700">
                              {item.subcategory || '-'}
                            </td>
                            <td className="p-4 text-right font-mono text-slate-900">
                              R$ {(Number(item.unit_price) || 0).toFixed(2)}
                            </td>
                            <td className="p-4 text-right font-mono font-semibold text-slate-900">
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
              <div className="bg-gradient-to-br from-slate-50 to-white p-8">
                <div className="ml-auto max-w-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-mono font-semibold text-slate-900">
                      R$ {(subtotal || 0).toFixed(2)}
                    </span>
                  </div>

                  {(discount || 0) > 0 && (
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                      <span className="text-slate-600">Desconto</span>
                      <span className="font-mono font-semibold text-red-600">
                        -R$ {(discount || 0).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {(tax || 0) > 0 && (
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                      <span className="text-slate-600">Impostos</span>
                      <span className="font-mono font-semibold text-slate-900">
                        R$ {(tax || 0).toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4">
                    <span className="text-lg font-bold text-slate-900">Total</span>
                    <span className="font-mono text-3xl font-bold text-emerald-600">
                      R$ {formatCurrency(invoice.total_value).replace('R$ ', '')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Info Section */}
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Imported From */}
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-900">
                  Origem dos Dados
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Fonte</span>
                    <span className="font-mono text-slate-900">{sourceLabel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Criado em</span>
                    <span className="font-mono text-sm text-slate-900">
                      {formatDate(invoice.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Invoice Type Info */}
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-900">
                  Informações Adicionais
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Tipo de NF</span>
                    <Badge variant="outline">{invoice.type}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">ID</span>
                    <span className="ml-2 truncate font-mono text-xs text-slate-900">
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
