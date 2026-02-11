"use client";

import { useState } from "react";
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  FileText,
  Calendar,
  Store,
  MoreVertical,
  Filter,
  ChevronRight,
  Receipt,
} from "lucide-react";
import { InvoiceCard } from "@/components/invoices/invoice-card";
import { UpgradeModal } from "@/components/subscription/upgrade-modal";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, StatCard } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/input";
import { Modal, ConfirmModal } from "@/components/ui/modal";
import { Skeleton, SkeletonListItem } from "@/components/ui/skeleton";
import {
  useInvoices,
  useUploadXML,
  useProcessQRCode,
  useUploadPhotos,
  usePendingProcessing,
  useDeleteProcessing,
} from "@/hooks/use-invoices";
import { useInvoicesSummary } from "@/hooks/use-invoices-summary";
import { formatCurrency, formatDate } from "@/lib/utils";

// Upload Modal Component
function UploadModal({
  isOpen,
  onClose,
  onSubscriptionError,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubscriptionError: (error: { limitType: "invoice" | "analysis"; currentPlan: string }) => void;
}) {
  const [activeTab, setActiveTab] = useState<"photo" | "xml" | "qrcode">("photo");
  const [qrCode, setQrCode] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const router = useRouter();
  const uploadXMLMutation = useUploadXML();
  const uploadPhotosMutation = useUploadPhotos();
  const processQRCodeMutation = useProcessQRCode();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleSubscriptionError = (error: any) => {
    const status = error?.response?.status;
    if (status === 402 || status === 429) {
      const headers = error?.response?.headers;
      const limitType = (headers?.["x-limit-type"] as "invoice" | "analysis") || "invoice";
      const currentPlan = (headers?.["x-current-plan"] as string) || "free";

      onSubscriptionError({ limitType, currentPlan });
      onClose();
    }
  };

  const handleSubmit = () => {
    if (activeTab === "photo" && selectedFiles.length > 0) {
      uploadPhotosMutation.mutate(selectedFiles, {
        onSuccess: (data) => {
          onClose();
          router.push(`/invoices/review/${data.processing_id}`);
        },
        onError: handleSubscriptionError,
      });
    } else if (activeTab === "xml") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".xml";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          uploadXMLMutation.mutate(file, {
            onSuccess: () => {
              onClose();
              router.push("/invoices");
            },
            onError: handleSubscriptionError,
          });
        }
      };
      input.click();
    } else if (activeTab === "qrcode" && qrCode) {
      processQRCodeMutation.mutate(
        { qrcode_url: qrCode },
        {
          onSuccess: () => {
            onClose();
            router.push("/invoices");
          },
          onError: handleSubscriptionError,
        }
      );
    }
  };

  const isUploading =
    uploadXMLMutation.isPending ||
    uploadPhotosMutation.isPending ||
    processQRCodeMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adicionar Nota Fiscal"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={isUploading}
            disabled={
              (activeTab === "photo" && selectedFiles.length === 0) ||
              (activeTab === "qrcode" && !qrCode)
            }
          >
            Enviar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          {[
            { id: "photo", label: "Foto" },
            { id: "xml", label: "XML" },
            { id: "qrcode", label: "QR Code" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "photo" && (
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="photo-upload"
            />
            <label
              htmlFor="photo-upload"
              className="cursor-pointer flex flex-col items-center gap-3"
            >
              <div className="w-16 h-16 rounded-full bg-primary-subtle flex items-center justify-center">
                <Receipt className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Clique para selecionar fotos
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedFiles.length > 0
                    ? `${selectedFiles.length} arquivo(s) selecionado(s)`
                    : "Suporte para múltiplas fotos"}
                </p>
              </div>
            </label>
          </div>
        )}

        {activeTab === "xml" && (
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
            <p className="text-muted-foreground">
              Clique em "Enviar" para selecionar o arquivo XML
            </p>
          </div>
        )}

        {activeTab === "qrcode" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Cole a URL do QR Code:
            </p>
            <textarea
              value={qrCode}
              onChange={(e) => setQrCode(e.target.value)}
              placeholder="https://www.sefaz..."
              className="w-full h-32 p-4 rounded-lg border border-border bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}
      </div>
    </Modal>
  );
}


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
    <div className="flex items-center gap-4 p-4 bg-warning-subtle/30 rounded-xl border border-warning/20">
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center">
        <Receipt className="w-6 h-6 text-warning" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">
          {item.extracted_issuer_name || "Processando..."}
        </p>
        <div className="flex items-center gap-2 mt-1">
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
            onClick={() => router.push(`/invoices/review/${item.processing_id}`)}
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
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

  // Filter invoices
  const filteredInvoices = React.useMemo(() => {
    if (!invoices) return [];
    if (!searchQuery.trim()) return invoices;

    const query = searchQuery.toLowerCase().trim();

    return invoices.filter((invoice) => {
      const issuerName = invoice.issuer_name?.toLowerCase() || '';
      const accessKey = invoice.access_key?.toLowerCase() || '';

      return issuerName.includes(query) || accessKey.includes(query);
    });
  }, [invoices, searchQuery]);

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
      onFloatingActionClick={() => setIsUploadModalOpen(true)}
      floatingActionLabel="Nota"
    >
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
              icon={<FileText className="w-5 h-5" />}
            />
            <StatCard
              title="Total Gasto"
              value={formatCurrency(summary?.total_spent || 0)}
              icon={<Store className="w-5 h-5" />}
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
              icon={<Calendar className="w-5 h-5" />}
            />
          </>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <SearchInput
            placeholder="Buscar por estabelecimento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery("")}
          />
        </div>
        <Button
          variant="outline"
          leftIcon={<Filter className="w-4 h-4" />}
          className="sm:hidden"
        >
          Filtros
        </Button>
      </div>

      {/* Pending Section */}
      {pendingProcessing && pendingProcessing.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">
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
        <div className="flex items-center justify-between mb-3">
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
          <div className="space-y-3">
            {filteredInvoices.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                onClick={() => router.push(`/invoices/${invoice.id}`)}
              />
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchQuery ? "Nenhuma nota encontrada" : "Nenhuma nota registrada"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "Tente ajustar sua busca"
                : "Adicione sua primeira nota fiscal para começar"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsUploadModalOpen(true)}>
                Adicionar Nota
              </Button>
            )}
          </Card>
        )}
      </section>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSubscriptionError={setSubscriptionError}
      />

      {/* Upgrade Modal */}
      {subscriptionError && (
        <UpgradeModal
          isOpen={true}
          onClose={() => setSubscriptionError(null)}
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
