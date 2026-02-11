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
import { useDashboardSummary, useRecentInsights } from "@/hooks/use-dashboard";
import { useMarkInsightAsRead } from "@/hooks/use-insights";
import {
  useUploadXML,
  useProcessQRCode,
  useUploadPhotos,
  useInvoices,
} from "@/hooks/use-invoices";
import { InvoiceCard } from "@/components/invoices/invoice-card";
import { UploadModal } from "@/components/invoices/upload-modal";
import { UpgradeModal } from "@/components/subscription/upgrade-modal";
import { formatCurrency } from "@/lib/utils";

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

interface SubscriptionError {
  limitType: "invoice" | "analysis";
  currentPlan: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<SubscriptionError | null>(null);

  const { data: summary, isLoading: isSummaryLoading } = useDashboardSummary();
  const { data: insights, isLoading: isInsightsLoading } = useRecentInsights(3);
  const { data: recentInvoices, isLoading: isInvoicesLoading } = useInvoices(0, 3);
  const markAsReadMutation = useMarkInsightAsRead();

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

      {/* Shared Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadXML={handleUploadXML}
        onUploadImages={handleUploadImages}
        onProcessQRCode={handleProcessQRCode}
        isUploading={isUploading}
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
    </PageLayout>
  );
}
