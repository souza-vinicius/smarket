'use client';

import { useState } from 'react';
import { Filter, CheckCircle, AlertTriangle, TrendingUp, Info, Lightbulb, Sparkles } from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { InsightCard } from '@/components/dashboard/insight-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useInsights, useMarkInsightAsRead } from '@/hooks/use-insights';

type FilterType = 'all' | 'unread' | 'price_alert' | 'category_insight' | 'merchant_pattern';
type PriorityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low';

export default function InsightsPage() {
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  
  const { data: insights, isLoading } = useInsights({
    type: typeFilter === 'all' ? undefined : typeFilter,
    priority: priorityFilter === 'all' ? undefined : priorityFilter,
  });
  
  const markAsReadMutation = useMarkInsightAsRead();
  // const dismissMutation = useDismissInsight();

  const filters: { value: FilterType; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: 'Todos', icon: <Filter className="h-4 w-4" /> },
    { value: 'unread', label: 'Não Lidos', icon: <CheckCircle className="h-4 w-4" /> },
    { value: 'price_alert', label: 'Alertas de Preço', icon: <AlertTriangle className="h-4 w-4" /> },
    { value: 'category_insight', label: 'Categorias', icon: <TrendingUp className="h-4 w-4" /> },
    { value: 'merchant_pattern', label: 'Estabelecimentos', icon: <Info className="h-4 w-4" /> },
  ];

  const priorityFilters: { value: PriorityFilter; label: string; color: string }[] = [
    { value: 'all', label: 'Todas Prioridades', color: 'bg-slate-100 text-slate-700' },
    { value: 'critical', label: 'Crítica', color: 'bg-red-100 text-red-700' },
    { value: 'high', label: 'Alta', color: 'bg-orange-100 text-orange-700' },
    { value: 'medium', label: 'Média', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'low', label: 'Baixa', color: 'bg-green-100 text-green-700' },
  ];

  const unreadCount = insights?.filter((i) => !i.is_read).length || 0;
  const criticalCount = insights?.filter((i) => i.priority === 'critical' && !i.is_read).length || 0;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      
      <div className="flex-1 pl-64">
        <Header 
          title="Insights" 
          subtitle="Análises e recomendações para economizar"
        />
        
        <main className="p-6">
          {/* Stats Cards */}
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total de Insights</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">
                    {insights?.length || 0}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <Lightbulb className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Não Lidos</p>
                  <p className="text-3xl font-bold text-emerald-600 mt-1">
                    {unreadCount}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Alertas Críticos</p>
                  <p className="text-3xl font-bold text-red-600 mt-1">
                    {criticalCount}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Filtrar por tipo:</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setTypeFilter(filter.value)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    typeFilter === filter.value
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {filter.icon}
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-4">
              <Filter className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Filtrar por prioridade:</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {priorityFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setPriorityFilter(filter.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    priorityFilter === filter.value
                      ? filter.color + ' ring-2 ring-offset-2 ring-current'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Insights Grid */}
          {isLoading ? (
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
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
            <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center bg-white">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Sparkles className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Nenhum insight encontrado
              </h3>
              <p className="text-slate-600 mb-4">
                {typeFilter !== 'all' || priorityFilter !== 'all'
                  ? 'Tente ajustar os filtros para ver mais insights'
                  : 'Adicione notas fiscais para começar a receber insights personalizados'}
              </p>
              {(typeFilter !== 'all' || priorityFilter !== 'all') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setTypeFilter('all');
                    setPriorityFilter('all');
                  }}
                >
                  Limpar Filtros
                </Button>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
