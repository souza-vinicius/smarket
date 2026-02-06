'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { DollarSign, FileText, AlertCircle, TrendingUp, Plus, ArrowUpRight, Sparkles } from 'lucide-react';

import { InsightCard } from '@/components/dashboard/insight-card';
import { SummaryCard } from '@/components/dashboard/summary-card';
import { UploadModal } from '@/components/invoices/upload-modal';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardSummary, useRecentInsights } from '@/hooks/use-dashboard';
import { useMarkInsightAsRead } from '@/hooks/use-insights';
import { useUploadXML, useProcessQRCode, useUploadPhotos } from '@/hooks/use-invoices';

type UploadMode = 'qrcode' | 'xml' | 'photo' | null;

export default function DashboardPage() {
  const router = useRouter();
  const { data: summary, isLoading: isSummaryLoading } = useDashboardSummary();
  const { data: insights, isLoading: isInsightsLoading } = useRecentInsights(6);
  const markAsReadMutation = useMarkInsightAsRead();

  const [uploadMode, setUploadMode] = useState<UploadMode>(null);
  const uploadXMLMutation = useUploadXML();
  const uploadPhotosMutation = useUploadPhotos();
  const processQRCodeMutation = useProcessQRCode();

  const handleUploadXML = (file: File) => {
    uploadXMLMutation.mutate(file, {
      onSuccess: () => {
        setUploadMode(null);
        router.push('/invoices');
      },
    });
  };

  const handleUploadPhoto = (file: File) => {
    uploadPhotosMutation.mutate([file], {
      onSuccess: (data) => {
        setUploadMode(null);
        if (data.processing_id) {
          router.push(`/invoices/review/${data.processing_id}`);
        }
      },
    });
  };

  const handleProcessQRCode = (url: string) => {
    processQRCodeMutation.mutate({ qrcode_url: url }, {
      onSuccess: () => {
        setUploadMode(null);
        router.push('/invoices');
      },
    });
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 pl-64">
        <Header
          title="Dashboard"
          subtitle="Visão geral dos seus gastos e insights"
        />

        <main className="p-6">
          {/* Welcome Section */}
          <div className="mb-8 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="mb-2 text-2xl font-bold">Olá! 👋</h1>
                <p className="text-emerald-100">
                  Aqui está o resumo das suas compras e insights para economizar
                </p>
              </div>
              <div className="hidden sm:block">
                <Sparkles className="size-12 text-emerald-200" />
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {isSummaryLoading ? (
              <>
                <Skeleton className="h-36 rounded-xl" />
                <Skeleton className="h-36 rounded-xl" />
                <Skeleton className="h-36 rounded-xl" />
                <Skeleton className="h-36 rounded-xl" />
              </>
            ) : summary ? (
              <>
                <SummaryCard
                  title="Gastos do Mês"
                  value={summary.total_spent_this_month}
                  change={summary.month_over_month_change_percent}
                  icon={<DollarSign className="size-5" />}
                  format="currency"
                />
                <SummaryCard
                  title="Notas Fiscais"
                  value={summary.invoice_count_this_month}
                  subtitle="Este mês"
                  icon={<FileText className="size-5" />}
                  format="number"
                />
                <SummaryCard
                  title="Insights Não Lidos"
                  value={summary.unread_insights_count}
                  subtitle="Aguardando sua atenção"
                  icon={<AlertCircle className="size-5" />}
                  format="number"
                />
                <SummaryCard
                  title="Top Estabelecimento"
                  value={summary.top_merchant_this_month?.total || 0}
                  subtitle={summary.top_merchant_this_month?.name || 'N/A'}
                  icon={<TrendingUp className="size-5" />}
                  format="currency"
                />
              </>
            ) : null}
          </div>

          {/* Quick Actions */}
          <div className="mb-8 flex flex-wrap gap-4">
            <Button
              variant="primary"
              size="lg"
              leftIcon={<Plus className="size-4" />}
              className="shadow-md"
              onClick={() => { setUploadMode('photo'); }}
            >
              Adicionar Nota Fiscal
            </Button>
            <Button
              variant="outline"
              size="lg"
              leftIcon={<TrendingUp className="size-4" />}
            >
              Ver Análises
            </Button>
          </div>

          {/* Insights Section */}
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Insights Recentes</h2>
                <p className="text-sm text-slate-600">
                  Análises inteligentes para ajudar você a economizar
                </p>
              </div>
              <Button variant="ghost" size="sm">
                Ver todos
                <ArrowUpRight className="ml-2 size-4" />
              </Button>
            </div>

            {isInsightsLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={`skeleton-${String(i)}`} className="h-48 rounded-xl" />
                ))}
              </div>
            ) : insights && insights.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {insights.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    onMarkAsRead={(id) => { markAsReadMutation.mutate(id); }}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-slate-100">
                  <Sparkles className="size-8 text-slate-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">
                  Nenhum insight ainda
                </h3>
                <p className="mb-4 text-slate-600">
                  Adicione suas notas fiscais para começar a receber insights personalizados
                </p>
                <Button
                  variant="primary"
                  leftIcon={<Plus className="size-4" />}
                  onClick={() => { setUploadMode('photo'); }}
                >
                  Adicionar Primeira Nota
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={uploadMode !== null}
        onClose={() => { setUploadMode(null); }}
        onUploadXML={handleUploadXML}
        onUploadPhoto={handleUploadPhoto}
        onProcessQRCode={handleProcessQRCode}
        isUploading={uploadXMLMutation.isPending || processQRCodeMutation.isPending || uploadPhotosMutation.isPending}
        initialTab={uploadMode === 'qrcode' ? 'qrcode' : uploadMode === 'photo' ? 'photo' : 'xml'}
      />
    </div>
  );
}
