'use client';

import { DollarSign, FileText, AlertCircle, TrendingUp, Plus, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { SummaryCard } from '@/components/dashboard/summary-card';
import { InsightCard } from '@/components/dashboard/insight-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardSummary, useRecentInsights } from '@/hooks/use-dashboard';
import { useMarkInsightAsRead } from '@/hooks/use-insights';

export default function DashboardPage() {
  const { data: summary, isLoading: isSummaryLoading } = useDashboardSummary();
  const { data: insights, isLoading: isInsightsLoading } = useRecentInsights(6);
  const markAsReadMutation = useMarkInsightAsRead();

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
                <h1 className="text-2xl font-bold mb-2">Olá! 👋</h1>
                <p className="text-emerald-100">
                  Aqui está o resumo das suas compras e insights para economizar
                </p>
              </div>
              <div className="hidden sm:block">
                <Sparkles className="h-12 w-12 text-emerald-200" />
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
                  icon={<DollarSign className="h-5 w-5" />}
                  format="currency"
                />
                <SummaryCard
                  title="Notas Fiscais"
                  value={summary.invoice_count_this_month}
                  subtitle="Este mês"
                  icon={<FileText className="h-5 w-5" />}
                  format="number"
                />
                <SummaryCard
                  title="Insights Não Lidos"
                  value={summary.unread_insights_count}
                  subtitle="Aguardando sua atenção"
                  icon={<AlertCircle className="h-5 w-5" />}
                  format="number"
                />
                <SummaryCard
                  title="Top Estabelecimento"
                  value={summary.top_merchant_this_month?.total || 0}
                  subtitle={summary.top_merchant_this_month?.name || 'N/A'}
                  icon={<TrendingUp className="h-5 w-5" />}
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
              leftIcon={<Plus className="h-4 w-4" />}
              className="shadow-md"
            >
              Adicionar Nota Fiscal
            </Button>
            <Button
              variant="outline"
              size="lg"
              leftIcon={<TrendingUp className="h-4 w-4" />}
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
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            
            {isInsightsLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-xl" />
                ))}
              </div>
            ) : insights && insights.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {insights.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                  <Sparkles className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Nenhum insight ainda
                </h3>
                <p className="text-slate-600 mb-4">
                  Adicione suas notas fiscais para começar a receber insights personalizados
                </p>
                <Button
                  variant="primary"
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Adicionar Primeira Nota
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
