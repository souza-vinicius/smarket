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

import { InvoiceCard } from "@/components/invoices/invoice-card";
import { UploadModal } from "@/components/invoices/upload-modal";
import { PageLayout } from "@/components/layout/page-layout";
import { UpgradeModal } from "@/components/subscription/upgrade-modal";
import { Button } from "@/components/ui/button";
import { Card, StatCard } from "@/components/ui/card";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { useDashboardSummary, useRecentInsights } from "@/hooks/use-dashboard";
import { useMarkInsightAsRead } from "@/hooks/use-insights";
import {
  useUploadXML,
  useProcessQRCode,
  useUploadPhotos,
  useInvoices,
} from "@/hooks/use-invoices";
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
        <span className="absolute right-4 top-4 size-2 rounded-full bg-primary" />
      )}
      <div className="flex items-start gap-4">
        <div
          className={`flex size-10 flex-shrink-0 items-center justify-center rounded-xl border ${priorityColors[insight.priority as keyof typeof priorityColors] ||
            priorityColors.low
            }`}
        >
          <Sparkles className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 text-sm font-semibold text-foreground sm:text-base">
              {insight.title}
            </h3>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {insight.description}
          </p>
          {!insight.is_read && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAsRead}
              className="-ml-2 mt-3 text-primary"
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
      onFloatingActionClick={() => { setIsUploadModalOpen(true); }}
      floatingActionLabel="Nota"
    >
      {/* Welcome Section */}
      <Card
        padding="lg"
        className="mb-6 border-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="mb-2 text-2xl font-bold">Olá! 👋</h2>
            <p className="text-emerald-100">
              Aqui está o resumo das suas compras e insights para economizar.
            </p>
          </div>
          <div className="hidden sm:block">
            <Sparkles className="size-12 text-emerald-200/50" />
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
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
              icon={<DollarSign className="size-4 sm:size-5" />}
            />
            <StatCard
              title="Notas Fiscais"
              value={summary.invoice_count_this_month}
              subtitle="Este mês"
              icon={<FileText className="size-4 sm:size-5" />}
            />
            <StatCard
              title="Insights"
              value={summary.unread_insights_count}
              subtitle="Não lidos"
              icon={<AlertCircle className="size-4 sm:size-5" />}
            />
            <StatCard
              title="Top Estabelecimento"
              value={formatCurrency(summary.top_merchant_this_month?.total || 0)}
              subtitle={summary.top_merchant_this_month?.name || "N/A"}
              icon={<TrendingUp className="size-4 sm:size-5" />}
            />
          </>
        ) : null}
      </div>

      <div className="mb-8 hidden gap-3 sm:flex">
        <Button
          size="lg"
          leftIcon={<Receipt className="size-4" />}
          onClick={() => { setIsUploadModalOpen(true); }}
        >
          Adicionar Nota
        </Button>
        <Button
          variant="outline"
          size="lg"
          leftIcon={<TrendingUp className="size-4" />}
          onClick={() => { router.push("/dashboard/analytics"); }}
        >
          Ver Análises
        </Button>
      </div>

      {/* Recent Invoices Section */}
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Notas Fiscais Recentes</h2>
            <p className="text-sm text-muted-foreground">
              Suas últimas compras registradas
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            rightIcon={<ArrowRight className="size-4" />}
            onClick={() => { router.push("/invoices"); }}
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
                onClick={() => { router.push(`/invoices/${invoice.id}`); }}
              />
            ))}
          </div>
        ) : (
          <Card className="py-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma nota fiscal encontrada</p>
          </Card>
        )}
      </section>

      {/* Insights Section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Insights Recentes</h2>
            <p className="text-sm text-muted-foreground">
              Análises inteligentes para ajudar você a economizar
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            rightIcon={<ArrowRight className="size-4" />}
            onClick={() => { router.push("/insights"); }}
          >
            Ver todos
          </Button>
        </div>

        {isInsightsLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : insights && insights.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {insights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onMarkAsRead={() => { markAsReadMutation.mutate(insight.id); }}
              />
            ))}
          </div>
        ) : (
          <Card className="py-12 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
              <Sparkles className="size-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              Nenhum insight ainda
            </h3>
            <p className="mx-auto mb-4 max-w-md text-muted-foreground">
              Adicione suas notas fiscais para começar a receber insights personalizados
            </p>
            <Button onClick={() => { setIsUploadModalOpen(true); }}>
              Adicionar Primeira Nota
            </Button>
          </Card>
        )}
      </section>

      {/* Shared Upload Modal */}
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
    </PageLayout>
  );
}
