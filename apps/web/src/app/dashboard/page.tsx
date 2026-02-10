"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  FileText,
  AlertCircle,
  TrendingUp,
  Sparkles,
  Receipt,
  ArrowRight,
} from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import { useDashboardSummary, useRecentInsights } from "@/hooks/use-dashboard";
import { useMarkInsightAsRead } from "@/hooks/use-insights";
import {
  useUploadXML,
  useProcessQRCode,
  useUploadPhotos,
  useInvoices,
} from "@/hooks/use-invoices";
import { InvoiceCard } from "@/components/invoices/invoice-card";
import { formatCurrency } from "@/lib/utils";

// Upload Modal Component
function UploadModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
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

  const handleSubmit = () => {
    if (activeTab === "photo" && selectedFiles.length > 0) {
      uploadPhotosMutation.mutate(selectedFiles, {
        onSuccess: (data) => {
          onClose();
          router.push(`/invoices/review/${data.processing_id}`);
        },
      });
    } else if (activeTab === "xml") {
      // Handle XML upload
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
            { id: "photo", label: "Foto", icon: "📷" },
            { id: "xml", label: "XML", icon: "📄" },
            { id: "qrcode", label: "QR Code", icon: "📱" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "photo" && (
          <div className="space-y-4">
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
                    ou arraste e solte aqui
                  </p>
                </div>
              </label>
            </div>
            {selectedFiles.length > 0 && (
              <p className="text-sm text-muted-foreground text-center">
                {selectedFiles.length} arquivo(s) selecionado(s)
              </p>
            )}
          </div>
        )}

        {activeTab === "xml" && (
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
            <input
              type="file"
              accept=".xml"
              onChange={handleFileSelect}
              className="hidden"
              id="xml-upload"
            />
            <label
              htmlFor="xml-upload"
              className="cursor-pointer flex flex-col items-center gap-3"
            >
              <div className="w-16 h-16 rounded-full bg-primary-subtle flex items-center justify-center">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Selecionar arquivo XML
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Arquivos da nota fiscal eletrônica
                </p>
              </div>
            </label>
          </div>
        )}

        {activeTab === "qrcode" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Cole a URL do QR Code da nota fiscal:
            </p>
            <textarea
              value={qrCode}
              onChange={(e) => setQrCode(e.target.value)}
              placeholder="https://www.sefaz..."
              className="w-full h-32 p-4 rounded-lg border border-border bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

// Insight Card Component
function InsightCard({
  insight,
  onMarkAsRead,
}: {
  insight: {
    id: string;
    title: string;
    description: string;
    type: string;
    priority: string;
    is_read: boolean;
  };
  onMarkAsRead: () => void;
}) {
  const priorityColors = {
    critical: "bg-destructive-subtle text-destructive border-destructive/20",
    high: "bg-warning-subtle text-warning border-warning/20",
    medium: "bg-info-subtle text-info border-info/20",
    low: "bg-muted text-muted-foreground border-border",
  };

  return (
    <Card
      isInteractive
      className={`relative overflow-hidden ${!insight.is_read ? "border-primary/30" : ""
        }`}
    >
      {!insight.is_read && (
        <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary" />
      )}
      <div className="flex items-start gap-4">
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border ${priorityColors[insight.priority as keyof typeof priorityColors] ||
            priorityColors.low
            }`}
        >
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm sm:text-base font-semibold text-foreground line-clamp-1">
              {insight.title}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {insight.description}
          </p>
          {!insight.is_read && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAsRead}
              className="mt-3 -ml-2 text-primary"
            >
              Marcar como lido
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const { data: summary, isLoading: isSummaryLoading } = useDashboardSummary();
  const { data: insights, isLoading: isInsightsLoading } = useRecentInsights(3);
  const { data: recentInvoices, isLoading: isInvoicesLoading } = useInvoices(0, 3);
  const markAsReadMutation = useMarkInsightAsRead();

  return (
    <PageLayout
      title="Dashboard"
      subtitle="Visão geral dos seus gastos e insights"
      showFloatingAction
      onFloatingActionClick={() => setIsUploadModalOpen(true)}
      floatingActionLabel="Nota"
    >
      {/* Welcome Section */}
      <Card
        padding="lg"
        className="mb-6 bg-gradient-to-r from-emerald-600 to-teal-600 border-0 text-white"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">Olá! 👋</h2>
            <p className="text-emerald-100">
              Aqui está o resumo das suas compras e insights para economizar.
            </p>
          </div>
          <div className="hidden sm:block">
            <Sparkles className="w-12 h-12 text-emerald-200/50" />
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isSummaryLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : summary ? (
          <>
            <StatCard
              title="Gastos do Mês"
              value={formatCurrency(summary.total_spent_this_month)}
              trend={
                summary.month_over_month_change_percent !== 0
                  ? {
                    value: Math.abs(summary.month_over_month_change_percent),
                    isPositive: summary.month_over_month_change_percent < 0,
                  }
                  : undefined
              }
              icon={<DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />}
            />
            <StatCard
              title="Notas Fiscais"
              value={summary.invoice_count_this_month}
              subtitle="Este mês"
              icon={<FileText className="w-4 h-4 sm:w-5 sm:h-5" />}
            />
            <StatCard
              title="Insights"
              value={summary.unread_insights_count}
              subtitle="Não lidos"
              icon={<AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />}
            />
            <StatCard
              title="Top Estabelecimento"
              value={formatCurrency(summary.top_merchant_this_month?.total || 0)}
              subtitle={summary.top_merchant_this_month?.name || "N/A"}
              icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />}
            />
          </>
        ) : null}
      </div>

      <div className="hidden sm:flex gap-3 mb-8">
        <Button
          size="lg"
          leftIcon={<Receipt className="w-4 h-4" />}
          onClick={() => setIsUploadModalOpen(true)}
        >
          Adicionar Nota
        </Button>
        <Button
          variant="outline"
          size="lg"
          leftIcon={<TrendingUp className="w-4 h-4" />}
          onClick={() => router.push("/dashboard/analytics")}
        >
          Ver Análises
        </Button>
      </div>

      {/* Recent Invoices Section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Notas Fiscais Recentes</h2>
            <p className="text-sm text-muted-foreground">
              Suas últimas compras registradas
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            rightIcon={<ArrowRight className="w-4 h-4" />}
            onClick={() => router.push("/invoices")}
          >
            Ver todas
          </Button>
        </div>

        {isInvoicesLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : recentInvoices && recentInvoices.length > 0 ? (
          <div className="space-y-3">
            {recentInvoices.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                onClick={() => router.push(`/invoices/${invoice.id}`)}
              />
            ))}
          </div>
        ) : (
          <Card className="text-center py-8">
            <p className="text-muted-foreground text-sm">Nenhuma nota fiscal encontrada</p>
          </Card>
        )}
      </section>

      {/* Insights Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Insights Recentes</h2>
            <p className="text-sm text-muted-foreground">
              Análises inteligentes para ajudar você a economizar
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            rightIcon={<ArrowRight className="w-4 h-4" />}
            onClick={() => router.push("/insights")}
          >
            Ver todos
          </Button>
        </div>

        {isInsightsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : insights && insights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onMarkAsRead={() => markAsReadMutation.mutate(insight.id)}
              />
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhum insight ainda
            </h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Adicione suas notas fiscais para começar a receber insights personalizados
            </p>
            <Button onClick={() => setIsUploadModalOpen(true)}>
              Adicionar Primeira Nota
            </Button>
          </Card>
        )}
      </section>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </PageLayout>
  );
}
