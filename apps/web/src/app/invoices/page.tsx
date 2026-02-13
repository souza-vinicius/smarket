"use client";

import { useState } from "react";
import * as React from "react";

import { useRouter } from "next/navigation";

import { FileText, Calendar, Store, Filter, Receipt } from "lucide-react";

import { UploadModal } from "@/components/invoices/upload-modal";
import { VirtualizedInvoiceList } from "@/components/invoices/virtualized-invoice-list";
import { PageLayout } from "@/components/layout/page-layout";
import { UpgradeModal } from "@/components/subscription/upgrade-modal";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, StatCard } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/input";
import { ConfirmModal } from "@/components/ui/modal";
import { Skeleton, SkeletonListItem } from "@/components/ui/skeleton";
import { useGroupedInvoices } from "@/hooks/use-grouped-invoices";
import {
  useInvoices,
  useUploadXML,
  useProcessQRCode,
  useUploadPhotos,
  usePendingProcessing,
  useDeleteProcessing,
} from "@/hooks/use-invoices";
import { useInvoicesSummary } from "@/hooks/use-invoices-summary";
import { formatCurrency } from "@/lib/utils";

// Pending Item - Mobile optimized
function PendingItem({
  item,
  onDelete,
  isDeleting,
}: {
  item: {
    processing_id: string;
    status: string;
    extracted_issuer_name?: string;
    extracted_total_value?: number;
    image_count: number;
  };
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-4 rounded-xl border border-warning/20 bg-warning-subtle/30 p-4">
      <div className="flex size-12 flex-shrink-0 items-center justify-center rounded-xl bg-warning/20">
        <Receipt className="size-6 text-warning" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">
          {item.extracted_issuer_name || "Processando..."}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <StatusBadge status={item.status} />
          <span className="text-xs text-muted-foreground">
            {item.image_count} foto(s)
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {item.status === "extracted" && (
          <Button
            size="sm"
            onClick={() => { router.push(`/invoices/review/${item.processing_id}`); }}
          >
            Revisar
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          isLoading={isDeleting}
          className="text-destructive hover:bg-destructive-subtle"
        >
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </Button>
      </div>
    </div>
  );
}

interface SubscriptionError {
  limitType: "invoice" | "analysis";
  currentPlan: string;
}

export default function InvoicesPage() {
  const router = useRouter();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<SubscriptionError | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [processingToDelete, setProcessingToDelete] = useState<string | null>(null);

  const { data: invoices, isLoading: isInvoicesLoading } = useInvoices();
  const { data: pendingProcessing, isLoading: isPendingLoading } = usePendingProcessing();
  const { data: summary, isLoading: isSummaryLoading } = useInvoicesSummary();
  const deleteProcessingMutation = useDeleteProcessing();

  // Upload hooks
  const uploadXMLMutation = useUploadXML();
  const uploadPhotosMutation = useUploadPhotos();
  const processQRCodeMutation = useProcessQRCode();

  const handleSubscriptionError = (error: any) => {
    const status = error?.response?.status;
    if (status === 402 || status === 429) {
      const headers = error?.response?.headers;
      const limitType = (headers?.["x-limit-type"] as "invoice" | "analysis") || "invoice";
      const currentPlan = (headers?.["x-current-plan"] as string) || "free";

      setSubscriptionError({ limitType, currentPlan });
      setIsUploadModalOpen(false);
    }
  };

  const handleUploadXML = (file: File) => {
    uploadXMLMutation.mutate(file, {
      onSuccess: () => {
        setIsUploadModalOpen(false);
        router.push("/invoices");
      },
      onError: handleSubscriptionError,
    });
  };

  const handleUploadImages = (files: File[]) => {
    uploadPhotosMutation.mutate(files, {
      onSuccess: (data) => {
        setIsUploadModalOpen(false);
        if (data.processing_id) {
          router.push(`/invoices/review/${data.processing_id}`);
        }
      },
      onError: handleSubscriptionError,
    });
  };

  const handleProcessQRCode = (url: string) => {
    processQRCodeMutation.mutate(
      { qrcode_url: url },
      {
        onSuccess: () => {
          setIsUploadModalOpen(false);
          router.push("/invoices");
        },
        onError: handleSubscriptionError,
      }
    );
  };

  const isUploading =
    uploadXMLMutation.isPending ||
    uploadPhotosMutation.isPending ||
    processQRCodeMutation.isPending;

  // Filter invoices
  const filteredInvoices = React.useMemo(() => {
    if (!invoices) {return [];}
    if (!searchQuery.trim()) {return invoices;}

    const query = searchQuery.toLowerCase().trim();

    return invoices.filter((invoice) => {
      const issuerName = invoice.issuer_name?.toLowerCase() || '';
      const accessKey = invoice.access_key?.toLowerCase() || '';

      return issuerName.includes(query) || accessKey.includes(query);
    });
  }, [invoices, searchQuery]);

  // Group invoices by month for virtualized rendering
  const groupedItems = useGroupedInvoices(filteredInvoices);

  const handleDelete = () => {
    if (processingToDelete) {
      deleteProcessingMutation.mutate(processingToDelete, {
        onSuccess: () => {
          setDeleteModalOpen(false);
          setProcessingToDelete(null);
        },
      });
    }
  };

  return (
    <PageLayout
      title="Notas Fiscais"
      subtitle="Gerencie suas notas NFC-e e NF-e"
      showFloatingAction
      onFloatingActionClick={() => { setIsUploadModalOpen(true); }}
      floatingActionLabel="Nota"
    >
      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {isSummaryLoading ? (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        ) : (
          <>
            <StatCard
              title="Total de Notas"
              value={invoices?.length || 0}
              icon={<FileText className="size-5" />}
            />
            <StatCard
              title="Total Gasto"
              value={formatCurrency(summary?.total_spent || 0)}
              icon={<Store className="size-5" />}
            />
            <StatCard
              title="Este Mês"
              value={
                invoices?.filter((inv) => {
                  const date = new Date(inv.issue_date);
                  const now = new Date();
                  return (
                    date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear()
                  );
                }).length || 0
              }
              icon={<Calendar className="size-5" />}
            />
          </>
        )}
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <SearchInput
            placeholder="Buscar por estabelecimento..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); }}
            onClear={() => { setSearchQuery(""); }}
          />
        </div>
        <Button
          variant="outline"
          leftIcon={<Filter className="size-4" />}
          className="sm:hidden"
        >
          Filtros
        </Button>
      </div>

      {/* Pending Section */}
      {pendingProcessing && pendingProcessing.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            Aguardando Revisão
          </h2>
          <div className="space-y-3">
            {isPendingLoading ? (
              <SkeletonListItem />
            ) : (
              pendingProcessing.map((item) => (
                <PendingItem
                  key={item.processing_id}
                  item={item}
                  onDelete={() => {
                    setProcessingToDelete(item.processing_id);
                    setDeleteModalOpen(true);
                  }}
                  isDeleting={deleteProcessingMutation.isPending}
                />
              ))
            )}
          </div>
        </section>
      )}

      {/* Invoices List */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Notas Processadas
          </h2>
          {searchQuery && (
            <span className="text-sm text-muted-foreground">
              {filteredInvoices.length} resultado{filteredInvoices.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {isInvoicesLoading ? (
          <div className="space-y-3">
            <SkeletonListItem />
            <SkeletonListItem />
            <SkeletonListItem />
          </div>
        ) : filteredInvoices.length > 0 ? (
          <VirtualizedInvoiceList items={groupedItems} />
        ) : (
          <Card className="py-12 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
              <FileText className="size-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              {searchQuery ? "Nenhuma nota encontrada" : "Nenhuma nota registrada"}
            </h3>
            <p className="mb-4 text-muted-foreground">
              {searchQuery
                ? "Tente ajustar sua busca"
                : "Adicione sua primeira nota fiscal para começar"}
            </p>
            {!searchQuery && (
              <Button onClick={() => { setIsUploadModalOpen(true); }}>
                Adicionar Nota
              </Button>
            )}
          </Card>
        )}
      </section>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => { setIsUploadModalOpen(false); }}
        onUploadXML={handleUploadXML}
        onUploadImages={handleUploadImages}
        onProcessQRCode={handleProcessQRCode}
        isUploading={isUploading}
      />

      {/* Upgrade Modal */}
      {subscriptionError && (
        <UpgradeModal
          isOpen={true}
          onClose={() => { setSubscriptionError(null); }}
          limitType={subscriptionError.limitType}
          currentPlan={subscriptionError.currentPlan}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setProcessingToDelete(null);
        }}
        onConfirm={handleDelete}
        isConfirming={deleteProcessingMutation.isPending}
        variant="danger"
        title="Excluir processamento"
        message="Tem certeza que deseja excluir este processamento? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
      />
    </PageLayout>
  );
}
