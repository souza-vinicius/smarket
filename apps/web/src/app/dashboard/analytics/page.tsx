'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import {
  MonthlySpendingChart,
  CategorySpendingChart,
  TrendLineChart,
} from '@/components/dashboard/spending-chart';

// Mock data for charts
const monthlyData = [
  { month: 'Jan', amount: 1250.5 },
  { month: 'Fev', amount: 980.0 },
  { month: 'Mar', amount: 1450.75 },
  { month: 'Abr', amount: 1100.25 },
  { month: 'Mai', amount: 1350.0 },
  { month: 'Jun', amount: 1200.5 },
];

const categoryData = [
  { category: 'Alimentos', amount: 450.5, color: '#3b82f6' },
  { category: 'Transporte', amount: 280.0, color: '#10b981' },
  { category: 'Saúde', amount: 150.75, color: '#f59e0b' },
  { category: 'Lazer', amount: 200.25, color: '#ef4444' },
  { category: 'Outros', amount: 169.0, color: '#8b5cf6' },
];

export default function AnalyticsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 pl-64">
        <Header
          title="Análises"
          subtitle="Visualize seus gastos e tendências"
        />

        <main className="p-6">
          {/* Charts Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            <MonthlySpendingChart
              data={monthlyData}
              title="Gastos Mensais"
            />
            <CategorySpendingChart
              data={categoryData}
              title="Gastos por Categoria"
            />
          </div>

          {/* Trend Chart */}
          <div className="mt-6">
            <TrendLineChart
              data={monthlyData}
              title="Tendência de Gastos"
            />
          </div>

          {/* Summary Stats */}
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Média Mensal</p>
              <p className="text-2xl font-bold">
                R$ {((monthlyData.reduce((acc, item) => acc + item.amount, 0)) / monthlyData.length).toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Maior Gasto</p>
              <p className="text-2xl font-bold">
                R$ {Math.max(...monthlyData.map((d) => d.amount)).toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Menor Gasto</p>
              <p className="text-2xl font-bold">
                R$ {Math.min(...monthlyData.map((d) => d.amount)).toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Total no Período</p>
              <p className="text-2xl font-bold">
                R$ {monthlyData.reduce((acc, item) => acc + item.amount, 0).toFixed(2)}
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
