"use client";

import {
  MonthlySpendingChart,
  CategorySpendingChart,
  TrendLineChart,
  SubcategorySpendingChart,
} from "@/components/dashboard/spending-chart";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useSpendingTrends, useCategorySpending } from "@/hooks/use-analytics";

export default function AnalyticsPage() {
  const { data: trendsData, isLoading: trendsLoading } = useSpendingTrends(6);
  const { data: categoryData, isLoading: categoryLoading } = useCategorySpending(6);

  // Transform API data for charts
  const monthlyData =
    trendsData?.trends.map((t) => ({
      month: new Date(t.month).toLocaleDateString("pt-BR", { month: "short" }),
      amount: Number(t.total) || 0,
    })) ?? [];

  const categoryChartData =
    categoryData?.categories.map((c) => ({
      category: c.name,
      amount: Number(c.total_spent) || 0,
      color: c.color,
    })) ?? [];

  const subcategoryChartData =
    categoryData?.subcategories.map((s) => ({
      name: s.name,
      amount: Number(s.total_spent) || 0,
      color: s.color,
      parent_name: s.parent_name,
    })) ?? [];

  // Calculate summary stats
  const totalSpending = Number(monthlyData.reduce((acc, item) => acc + item.amount, 0)) || 0;
  const averageMonthly =
    monthlyData.length > 0 ? Number(totalSpending / monthlyData.length) || 0 : 0;
  const highestMonth =
    monthlyData.length > 0 && monthlyData.some((d) => d.amount > 0)
      ? Number(Math.max(...monthlyData.map((d) => d.amount))) || 0
      : 0;
  const lowestMonth =
    monthlyData.length > 0 && monthlyData.some((d) => d.amount > 0)
      ? Number(Math.min(...monthlyData.map((d) => d.amount))) || 0
      : 0;
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 pl-64">
        <Header title="Análises" subtitle="Visualize seus gastos e tendências" />

        <main className="p-6">
          {/* Summary Stats */}
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            {trendsLoading ? (
              <>
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
              </>
            ) : (
              <>
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Média Mensal</p>
                  <p className="text-2xl font-bold">R$ {averageMonthly.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Maior Gasto</p>
                  <p className="text-2xl font-bold">R$ {highestMonth.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Menor Gasto</p>
                  <p className="text-2xl font-bold">R$ {lowestMonth.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Total no Período</p>
                  <p className="text-2xl font-bold">R$ {totalSpending.toFixed(2)}</p>
                </div>
              </>
            )}
          </div>

          {/* Charts Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {trendsLoading ? (
              <Skeleton className="h-[400px] rounded-lg" />
            ) : (
              <MonthlySpendingChart data={monthlyData} title="Gastos Mensais" />
            )}
            {categoryLoading ? (
              <Skeleton className="h-[400px] rounded-lg" />
            ) : (
              <CategorySpendingChart data={categoryChartData} title="Gastos por Categoria" />
            )}
          </div>

          {/* Trend Chart */}
          <div className="mt-6">
            {trendsLoading ? (
              <Skeleton className="h-[400px] rounded-lg" />
            ) : (
              <TrendLineChart data={monthlyData} title="Tendência de Gastos" />
            )}
          </div>

          {/* Subcategory Chart */}
          <div className="mt-6">
            {categoryLoading ? (
              <Skeleton className="h-[400px] rounded-lg" />
            ) : (
              <SubcategorySpendingChart
                data={subcategoryChartData}
                title="Gastos por Subcategoria"
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
