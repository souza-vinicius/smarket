"use client";

import { useState, useMemo } from "react";

import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  Store,
  Receipt,
} from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, StatCard } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useSpendingTrends,
  useMerchantInsights,
  useCategorySpending,
} from "@/hooks/use-analytics";
import { formatCurrency } from "@/lib/utils";

// Map API period to months
const periodToMonths: Record<string, number> = {
  "7d": 1,
  "30d": 1,
  "90d": 3,
  "1y": 12,
};

function CategoryBar({
  name,
  value,
  percentage,
  color,
}: {
  name: string;
  value: number;
  percentage: number;
  color: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span
            className="size-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="font-medium text-foreground">{name}</span>
        </div>
        <span className="text-muted-foreground">
          {formatCurrency(value)} ({percentage}%)
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function MerchantCard({
  merchant,
  index,
}: {
  merchant: {
    name: string;
    total_spent: number;
    visit_count: number;
    average_ticket: number;
  };
  index: number;
}) {
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <Card isInteractive className="flex items-center gap-4">
      <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-subtle text-lg">
        {medals[index] || `${index + 1}º`}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold text-foreground">
          {merchant.name}
        </h3>
        <p className="text-sm text-muted-foreground">
          {merchant.visit_count} compras • Ticket médio{" "}
          {formatCurrency(merchant.average_ticket)}
        </p>
      </div>
      <div className="text-right">
        <p className="font-bold text-foreground">
          {formatCurrency(merchant.total_spent)}
        </p>
      </div>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "1y">("30d");

  // Fetch data from APIs
  const { data: categoryData, isLoading: isCategoryLoading } =
    useCategorySpending(periodToMonths[period]);
  const { data: merchantData, isLoading: isMerchantLoading } =
    useMerchantInsights(10);
  const { data: trendsData, isLoading: isTrendsLoading } =
    useSpendingTrends(periodToMonths[period]);

  // Calculate stats from real data - respecting selected period
  const stats = useMemo(() => {
    const trends = trendsData?.trends || [];
    if (trends.length === 0) {return null;}

    // Calculate totals from trends (respects selected period)
    const totalInvoices = trends.reduce((sum, t) => sum + t.invoice_count, 0);
    const totalSpent = trends.reduce((sum, t) => sum + Number(t.total), 0);
    const averageTicket = totalInvoices > 0 ? totalSpent / totalInvoices : 0;

    // Get top category
    const categories = categoryData?.categories || [];
    const topCategory = categories[0] || { name: "N/A", total_spent: 0 };

    // Calculate period-over-period change
    // Split trends into current period and previous period
    const midPoint = Math.floor(trends.length / 2);
    const firstHalf = trends.slice(0, midPoint);
    const secondHalf = trends.slice(midPoint);

    const firstHalfTotal = firstHalf.reduce((sum, t) => sum + Number(t.total), 0);
    const secondHalfTotal = secondHalf.reduce((sum, t) => sum + Number(t.total), 0);

    const periodChange =
      firstHalfTotal > 0
        ? ((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100
        : 0;

    return {
      totalSpent,
      invoiceCount: totalInvoices,
      averageTicket,
      topCategory,
      periodChange,
    };
  }, [trendsData, categoryData]);

  // Process categories with percentages
  const categoriesWithPercentage = useMemo(() => {
    if (!categoryData?.categories) {return [];}

    const total = categoryData.categories.reduce(
      (sum, c) => sum + c.total_spent,
      0
    );

    return categoryData.categories.map((cat) => ({
      ...cat,
      percentage: total > 0 ? Math.round((cat.total_spent / total) * 100) : 0,
    }));
  }, [categoryData]);

  const isLoading =
    isCategoryLoading || isMerchantLoading || isTrendsLoading;

  return (
    <PageLayout
      title="Análises"
      subtitle="Acompanhe seus gastos e economias"
      showBackButton
    >
      {/* Period Selector */}
      <div className="scrollbar-hide -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {[
          { key: "7d", label: "7 dias" },
          { key: "30d", label: "30 dias" },
          { key: "90d", label: "3 meses" },
          { key: "1y", label: "1 ano" },
        ].map((p) => (
          <Button
            key={p.key}
            variant={period === p.key ? "primary" : "outline"}
            size="sm"
            onClick={() => { setPeriod(p.key as typeof period); }}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {isLoading ? (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        ) : stats ? (
          <>
            <StatCard
              title="Total Gasto"
              value={formatCurrency(stats.totalSpent)}
              trend={
                stats.periodChange !== 0
                  ? {
                      value: Math.abs(stats.periodChange),
                      isPositive: stats.periodChange < 0,
                    }
                  : undefined
              }
              icon={<DollarSign className="size-5" />}
            />
            <StatCard
              title="Notas Fiscais"
              value={stats.invoiceCount}
              icon={<Receipt className="size-5" />}
            />
            <StatCard
              title="Ticket Médio"
              value={formatCurrency(stats.averageTicket)}
              icon={<BarChart3 className="size-5" />}
            />
            <StatCard
              title="Top Categoria"
              value={stats.topCategory.name}
              subtitle={formatCurrency(stats.topCategory.total_spent)}
              icon={<PieChart className="size-5" />}
            />
          </>
        ) : null}
      </div>

      {/* Categories Section */}
      <section className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Gastos por Categoria
          </h2>
          <Badge variant="outline">
            {categoriesWithPercentage.length} categorias
          </Badge>
        </div>

        <Card>
          {isCategoryLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          ) : categoriesWithPercentage.length > 0 ? (
            <div className="space-y-4">
              {categoriesWithPercentage.map((category) => (
                <CategoryBar
                  key={category.id}
                  name={category.name}
                  value={category.total_spent}
                  percentage={category.percentage}
                  color={category.color}
                />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <PieChart className="mx-auto mb-3 size-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                Nenhuma categoria encontrada para este período
              </p>
            </div>
          )}
        </Card>
      </section>

      {/* Top Merchants Section */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Top Estabelecimentos
        </h2>

        {isMerchantLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : merchantData?.merchants && merchantData.merchants.length > 0 ? (
          <div className="space-y-3">
            {merchantData.merchants.map((merchant, index) => (
              <MerchantCard
                key={merchant.id}
                merchant={merchant}
                index={index}
              />
            ))}
          </div>
        ) : (
          <Card className="py-8 text-center">
            <Store className="mx-auto mb-3 size-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              Nenhum estabelecimento encontrado
            </p>
          </Card>
        )}
      </section>

      {/* Insights Summary */}
      {stats && stats.periodChange < 0 && (
        <Card className="mt-6 border-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
          <div className="flex items-start gap-4">
            <div className="flex size-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/20">
              <TrendingDown className="size-6" />
            </div>
            <div>
              <h3 className="mb-1 text-lg font-semibold">
                Você está economizando!
              </h3>
              <p className="text-emerald-100">
                Seus gastos estão {Math.abs(stats.periodChange).toFixed(1)}%
                menores que o período anterior. Continue assim!
              </p>
            </div>
          </div>
        </Card>
      )}

      {stats && stats.periodChange > 0 && (
        <Card className="mt-6 border-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          <div className="flex items-start gap-4">
            <div className="flex size-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/20">
              <TrendingUp className="size-6" />
            </div>
            <div>
              <h3 className="mb-1 text-lg font-semibold">Atenção!</h3>
              <p className="text-amber-100">
                Seus gastos aumentaram {stats.periodChange.toFixed(1)}% em
                relação ao período anterior. Fique de olho!
              </p>
            </div>
          </div>
        </Card>
      )}
    </PageLayout>
  );
}
