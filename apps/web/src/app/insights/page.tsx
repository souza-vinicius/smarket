"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import {
  Sparkles,
  Check,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  Filter,
} from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInsights, useMarkInsightAsRead } from "@/hooks/use-insights";
import { formatDate } from "@/lib/utils";

interface Insight {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: "critical" | "high" | "medium" | "low";
  is_read: boolean;
  created_at: string;
}

const priorityConfig = {
  critical: {
    icon: AlertTriangle,
    color: "bg-destructive-subtle text-destructive border-destructive/20",
    label: "Crítico",
  },
  high: {
    icon: TrendingUp,
    color: "bg-warning-subtle text-warning border-warning/20",
    label: "Alto",
  },
  medium: {
    icon: Info,
    color: "bg-info-subtle text-info border-info/20",
    label: "Médio",
  },
  low: {
    icon: Sparkles,
    color: "bg-muted text-muted-foreground border-border",
    label: "Baixo",
  },
};

const typeConfig: Record<string, { label: string; color: string }> = {
  price_alert: { label: "Alerta de Preço", color: "bg-destructive/10 text-destructive" },
  category_insight: { label: "Categoria", color: "bg-primary/10 text-primary" },
  merchant_pattern: { label: "Estabelecimento", color: "bg-accent/10 text-accent" },
  summary: { label: "Resumo", color: "bg-muted text-muted-foreground" },
  budget_health: { label: "Orçamento", color: "bg-destructive/10 text-destructive" },
  per_capita_spending: { label: "Per Capita", color: "bg-info-subtle text-info" },
  essential_ratio: { label: "Essenciais", color: "bg-warning-subtle text-warning" },
  income_commitment: { label: "Renda", color: "bg-destructive/10 text-destructive" },
  children_spending: { label: "Crianças", color: "bg-primary/10 text-primary" },
  wholesale_opportunity: { label: "Atacado", color: "bg-accent/10 text-accent" },
  shopping_frequency: { label: "Frequência", color: "bg-warning-subtle text-warning" },
  seasonal_alert: { label: "Sazonalidade", color: "bg-info-subtle text-info" },
  savings_potential: { label: "Economia", color: "bg-primary/10 text-primary" },
  family_nutrition: { label: "Nutrição", color: "bg-accent/10 text-accent" },
};

function InsightCard({
  insight,
  onMarkAsRead,
}: {
  insight: Insight;
  onMarkAsRead: () => void;
}) {
  const priority = priorityConfig[insight.priority];
  const Icon = priority.icon;
  const typeStyle = typeConfig[insight.type] || typeConfig.summary;

  return (
    <Card
      isInteractive
      className={`relative ${!insight.is_read ? "border-primary/30" : ""}`}
    >
      {/* Unread indicator */}
      {!insight.is_read && (
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <span className="size-2 rounded-full bg-primary" />
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Priority Icon */}
        <div
          className={`flex size-12 flex-shrink-0 items-center justify-center rounded-xl border ${priority.color}`}
        >
          <Icon className="size-6" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 pr-8">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" size="sm" className={typeStyle.color}>
              {typeStyle.label}
            </Badge>
            <Badge variant="outline" size="sm">
              {priority.label}
            </Badge>
          </div>

          <h3 className="mb-1 font-semibold text-foreground">{insight.title}</h3>
          <p className="mb-3 text-sm text-muted-foreground">
            {insight.description}
          </p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {formatDate(insight.created_at)}
            </span>

            {!insight.is_read && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead();
                }}
                leftIcon={<Check className="size-4" />}
              >
                Marcar como lido
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function InsightSkeleton() {
  return (
    <Card className="flex items-start gap-4">
      <Skeleton variant="avatar" className="size-12" />
      <div className="flex-1 space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </div>
    </Card>
  );
}

export default function InsightsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const { data: insights, isLoading } = useInsights();
  const markAsReadMutation = useMarkInsightAsRead();

  // Filter insights
  const filteredInsights =
    insights?.filter((insight) => {
      if (filter === "unread") {return !insight.is_read;}
      if (filter === "read") {return insight.is_read;}
      return true;
    }) || [];

  // Stats
  const unreadCount = insights?.filter((i) => !i.is_read).length || 0;
  const readCount = insights?.filter((i) => i.is_read).length || 0;

  return (
    <PageLayout
      title="Insights"
      subtitle="Análises inteligentes para economizar"
    >
      {/* Stats Cards */}
      {!isLoading && insights && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <Card
            padding="sm"
            className={`cursor-pointer text-center transition-colors ${
              filter === "all" ? "border-primary bg-primary-subtle/30" : ""
            }`}
            onClick={() => { setFilter("all"); }}
          >
            <p className="text-2xl font-bold text-foreground">
              {insights.length}
            </p>
            <p className="text-xs text-muted-foreground">Total</p>
          </Card>
          <Card
            padding="sm"
            className={`cursor-pointer text-center transition-colors ${
              filter === "unread" ? "border-primary bg-primary-subtle/30" : ""
            }`}
            onClick={() => { setFilter("unread"); }}
          >
            <p className="text-2xl font-bold text-primary">{unreadCount}</p>
            <p className="text-xs text-muted-foreground">Não lidos</p>
          </Card>
          <Card
            padding="sm"
            className={`cursor-pointer text-center transition-colors ${
              filter === "read" ? "border-primary bg-primary-subtle/30" : ""
            }`}
            onClick={() => { setFilter("read"); }}
          >
            <p className="text-2xl font-bold text-muted-foreground">
              {readCount}
            </p>
            <p className="text-xs text-muted-foreground">Lidos</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="scrollbar-hide -mx-4 mb-6 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {[
          { key: "all", label: "Todos" },
          { key: "unread", label: "Não lidos" },
          { key: "read", label: "Lidos" },
        ].map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? "primary" : "outline"}
            size="sm"
            onClick={() => { setFilter(f.key as typeof filter); }}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Insights List */}
      {isLoading ? (
        <div className="space-y-3">
          <InsightSkeleton />
          <InsightSkeleton />
          <InsightSkeleton />
        </div>
      ) : filteredInsights.length > 0 ? (
        <div className="space-y-3">
          {filteredInsights.map((insight) => (
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
            {filter === "unread"
              ? "Nenhum insight não lido"
              : filter === "read"
              ? "Nenhum insight lido"
              : "Nenhum insight ainda"}
          </h3>
          <p className="mx-auto max-w-md text-muted-foreground">
            {filter === "all"
              ? "Adicione notas fiscais para receber insights personalizados"
              : "Ajuste o filtro para ver outros insights"}
          </p>
        </Card>
      )}
    </PageLayout>
  );
}
