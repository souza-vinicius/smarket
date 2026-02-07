'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Plus, Search, FileText, Calendar, Store, MoreVertical } from 'lucide-react';

import { UploadModal } from '@/components/invoices/upload-modal';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvoices, useUploadXML, useProcessQRCode, useUploadPhotos, usePendingProcessing, useDeleteInvoice, useDeleteProcessing } from '@/hooks/use-invoices';
import { useInvoicesSummary } from '@/hooks/use-invoices-summary';
import { PendingList } from '@/components/invoices/pending-list';
import { DeleteProcessingModal } from '@/components/invoices/delete-processing-modal';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function InvoicesPage() {
  const router = useRouter();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'nfce' | 'nfe'>('all');
  const [view, setView] = useState<'all' | 'processed' | 'pending'>('all');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [processingToDelete, setProcessingToDelete] = useState<{ id: string; issuerName?: string } | null>(null);
  const { data: invoices, isLoading } = useInvoices();
  const { data: pendingProcessing, isLoading: isPendingLoading } = usePendingProcessing();
  const { data: summary, isLoading: isSummaryLoading } = useInvoicesSummary();
  const uploadXMLMutation = useUploadXML();
  const uploadPhotosMutation = useUploadPhotos();
  const processQRCodeMutation = useProcessQRCode();
  const deleteInvoiceMutation = useDeleteInvoice();
  const deleteProcessingMutation = useDeleteProcessing();

  const handleUploadXML = (file: File) => {
    uploadXMLMutation.mutate(file, {
      onSuccess: () => {
        setIsUploadModalOpen(false);
      },
    });
  };

  const handleUploadImages = (files: File[]) => {
    uploadPhotosMutation.mutate(files, {
      onSuccess: (data) => {
        setIsUploadModalOpen(false);
        // Redirect to review page with processing_id
        router.push(`/invoices/review/${data.processing_id}`);
      },
    });
  };

  const handleProcessQRCode = (url: string) => {
    processQRCodeMutation.mutate({ qrcode_url: url }, {
      onSuccess: () => {
        setIsUploadModalOpen(false);
      },
    });
  };

  const handleViewDetails = (id: string) => {
    router.push(`/invoices/${id}`);
  };

  // Filter invoices based on search and type
  const filteredInvoices = invoices?.filter((invoice) => {
    const matchesSearch =
      invoice.issuer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.access_key.includes(searchQuery);
    const matchesType =
      filterType === 'all' ||
      (invoice.type && invoice.type.toLowerCase() === filterType);
    return matchesSearch && matchesType;
  }) || [];

  // Determine what to display based on view
  const showPending = view === 'all' || view === 'pending';
  const showProcessed = view === 'all' || view === 'processed';
  const pendingCount = pendingProcessing?.length || 0;
  const processedCount = filteredInvoices.length || 0;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 pl-64">
        <Header
          title="Notas Fiscais"
          subtitle="Gerencie suas notas fiscais NFC-e e NF-e"
        />

        <main className="p-6">
          {/* Stats Cards */}
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total de Notas</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">
                    {invoices?.length || 0}
                  </p>
                </div>
                <div className="flex size-12 items-center justify-center rounded-lg bg-emerald-100">
                  <FileText className="size-6 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-600">Total Gasto</p>
                  {isSummaryLoading ? (
                    <Skeleton className="mt-1 h-10 w-32" />
                  ) : (
                    <p className="mt-1 text-3xl font-bold text-slate-900">
                      {formatCurrency(summary?.total_spent || 0)}
                    </p>
                  )}
                </div>
                <div className="flex size-12 items-center justify-center rounded-lg bg-blue-100">
                  <Store className="size-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Este Mês</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">
                    {
                      invoices?.filter(inv => {
                        const invoiceDate = new Date(inv.issue_date);
                        const now = new Date();
                        return invoiceDate.getMonth() === now.getMonth() &&
                               invoiceDate.getFullYear() === now.getFullYear();
                      }).length || 0
                    }
                  </p>
                </div>
                <div className="flex size-12 items-center justify-center rounded-lg bg-purple-100">
                  <Calendar className="size-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Actions and Filters */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 gap-3">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Buscar por estabelecimento ou chave de acesso..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                  }}
                  className="h-11 pl-10"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant={filterType === 'all' ? 'primary' : 'outline'}
                  size="md"
                  onClick={() => {
                    setFilterType('all');
                  }}
                >
                  Todas
                </Button>
                <Button
                  variant={filterType === 'nfce' ? 'primary' : 'outline'}
                  size="md"
                  onClick={() => {
                    setFilterType('nfce');
                  }}
                >
                  NFC-e
                </Button>
                <Button
                  variant={filterType === 'nfe' ? 'primary' : 'outline'}
                  size="md"
                  onClick={() => {
                    setFilterType('nfe');
                  }}
                >
                  NF-e
                </Button>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              leftIcon={<Plus className="size-4" />}
              onClick={() => {
                setIsUploadModalOpen(true);
              }}
              className="shadow-md"
            >
              Adicionar Nota Fiscal
            </Button>
          </div>

          {/* View Filter Tabs */}
          <div className="mb-6 flex gap-2 border-b border-slate-200">
            <Button
              variant={view === 'all' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => {
                setView('all');
              }}
              className="border-b-2 rounded-none"
            >
              Todas
            </Button>
            <Button
              variant={view === 'pending' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => {
                setView('pending');
              }}
              className="border-b-2 rounded-none"
            >
              Aguardando
              {pendingCount > 0 && (
                <Badge className="ml-2 bg-amber-100 text-amber-700">{pendingCount}</Badge>
              )}
            </Button>
            <Button
              variant={view === 'processed' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => {
                setView('processed');
              }}
              className="border-b-2 rounded-none"
            >
              Processadas
              {processedCount > 0 && (
                <Badge className="ml-2 bg-emerald-100 text-emerald-700">{processedCount}</Badge>
              )}
            </Button>
          </div>

          {/* Pending Invoices Section */}
          {showPending && (
            <div className="mb-8">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Notas Aguardando Processamento/Revisão
                </h2>
                <p className="text-sm text-slate-600">
                  Você tem {pendingCount} nota{pendingCount !== 1 ? 's' : ''} aguardando processamento ou revisão
                </p>
              </div>
              <PendingList
                items={pendingProcessing || []}
                isLoading={isPendingLoading}
                onDelete={(processingId) => {
                  const item = pendingProcessing?.find(p => p.processing_id === processingId);
                  setProcessingToDelete({
                    id: processingId,
                    issuerName: item?.extracted_issuer_name || 'Processamento',
                  });
                  setDeleteModalOpen(true);
                }}
                isDeleting={deleteProcessingMutation.isPending}
              />
            </div>
          )}

          {/* Divider for visual separation */}
          {showPending && showProcessed && pendingCount > 0 && (
            <div className="mb-8 border-t border-slate-200" />
          )}

          {/* Processed Invoices Section */}
          {showProcessed && (
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Notas Processadas
                </h2>
              </div>

              {/* Invoice List */}
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {isLoading ? (
                  <div className="space-y-4 p-8">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={`skeleton-${String(i)}`} className="flex items-center gap-4 border-b border-slate-100 p-4">
                        <Skeleton className="size-12 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-3 w-1/4" />
                        </div>
                        <Skeleton className="h-8 w-24" />
                      </div>
                    ))}
                  </div>
                ) : filteredInvoices.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {filteredInvoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center gap-4 p-4 transition-colors hover:bg-slate-50"
                      >
                        <div className="flex size-12 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                          <FileText className="size-6 text-emerald-600" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <h3 className="truncate font-semibold text-slate-900">
                              {invoice.issuer_name}
                            </h3>
                            <Badge variant="outline" className="text-xs">
                              {invoice.type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3" />
                              {formatDate(invoice.issue_date)}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="size-3" />
                              {invoice.product_count} itens
                            </span>
                          </div>
                        </div>

                        <div className="flex-shrink-0 text-right">
                          <p className="text-lg font-bold text-slate-900">
                            {formatCurrency(invoice.total_value)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDate(invoice.created_at)}
                          </p>
                        </div>

                        <div className="flex flex-shrink-0 items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              handleViewDetails(invoice.id);
                            }}
                          >
                            Ver Detalhes
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-2"
                          >
                            <MoreVertical className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-slate-100">
                      <FileText className="size-8 text-slate-400" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-slate-900">
                      {searchQuery || filterType !== 'all'
                        ? 'Nenhuma nota fiscal encontrada'
                        : 'Nenhuma nota fiscal registrada'}
                    </h3>
                    <p className="mb-4 text-slate-600">
                      {searchQuery || filterType !== 'all'
                        ? 'Tente ajustar os filtros de busca'
                        : 'Adicione sua primeira nota fiscal para começar'}
                    </p>
                    {!searchQuery && filterType === 'all' && (
                      <Button
                        variant="primary"
                        leftIcon={<Plus className="size-4" />}
                        onClick={() => {
                          setIsUploadModalOpen(true);
                        }}
                      >
                        Adicionar Primeira Nota
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Delete Processing Modal */}
      <DeleteProcessingModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setProcessingToDelete(null);
        }}
        onConfirm={() => {
          if (processingToDelete) {
            deleteProcessingMutation.mutate(processingToDelete.id);
          }
        }}
        isDeleting={deleteProcessingMutation.isPending}
        issuerName={processingToDelete?.issuerName}
        error={deleteProcessingMutation.error?.message || null}
      />

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => { setIsUploadModalOpen(false); }}
        onUploadXML={handleUploadXML}
        onUploadImages={handleUploadImages}
        onProcessQRCode={handleProcessQRCode}
        isUploading={uploadXMLMutation.isPending || processQRCodeMutation.isPending || uploadPhotosMutation.isPending}
      />
    </div>
  );
}
