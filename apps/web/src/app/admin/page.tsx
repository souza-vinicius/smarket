"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import {
  Users,
  DollarSign,
  TrendingUp,
  CreditCard,
  FileText,
  Activity,
  RefreshCw,
  Server,
  Clock,
  Zap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { toast } from "sonner";

import {
  useAdminDashboardStats,
  useAdminRevenueChart,
  useAdminGrowthChart,
  useAdminOperationalMetrics,
  useSystemHealth,
} from "@/hooks/use-admin-analytics";
import adminApi from "@/lib/admin-api";
import type { ServiceHealth } from "@/types/admin";

interface AdminRootData {
  message: string;
  admin: {
    id: string;
    email: string;
    role: string;
  };
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, subtitle, icon }: StatCardProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">{title}</div>
        <div className="text-gray-400">{icon}</div>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      {subtitle && <div className="mt-2 text-xs text-gray-500">{subtitle}</div>}
    </div>
  );
}

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatMonth(month: string): string {
  const [year, m] = month.split("-");
  const monthIndex = parseInt(m, 10) - 1;
  const name = new Date(parseInt(year, 10), monthIndex, 1).toLocaleDateString(
    "pt-BR",
    { month: "short" }
  );
  return `${name}/${year.slice(2)}`;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  healthy: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  configured: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  degraded: { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500" },
  unhealthy: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  not_configured: { bg: "bg-gray-50", text: "text-gray-500", dot: "bg-gray-400" },
};

const SERVICE_LABELS: Record<string, string> = {
  database: "PostgreSQL",
  redis: "Redis",
  stripe: "Stripe",
  openrouter: "OpenRouter",
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Gemini",
};

function ServiceStatusBadge({ service }: { service: ServiceHealth }) {
  const colors = STATUS_COLORS[service.status] || STATUS_COLORS.not_configured;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
    >
      <span className={`size-1.5 rounded-full ${colors.dot}`} />
      {service.status === "not_configured" ? "N/A" : service.status}
      {service.latency_ms != null && (
        <span className="text-[10px] opacity-75">{service.latency_ms}ms</span>
      )}
    </span>
  );
}

function ChartSkeleton() {
  return (
    <div className="animate-pulse rounded-lg bg-white p-6 shadow">
      <div className="mb-6 h-5 w-1/3 rounded bg-gray-200" />
      <div className="h-[300px] rounded bg-gray-100" />
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<AdminRootData | null>(null);
  const [loading, setLoading] = useState(true);
  const { stats, isLoading: isLoadingStats } = useAdminDashboardStats();
  const { data: revenueData, isLoading: isLoadingRevenue } = useAdminRevenueChart(12);
  const { data: growthData, isLoading: isLoadingGrowth } = useAdminGrowthChart(12);
  const { metrics, isLoading: isLoadingOps } = useAdminOperationalMetrics();
  const { health, isLoading: isLoadingHealth, refetch: refetchHealth } = useSystemHealth();

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const response = await adminApi.get("/");
        setData(response.data);
      } catch (error: unknown) {
        console.error("Failed to fetch admin data:", error);
        toast.error("Erro ao carregar dados do admin");
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600">Carregando dashboard...</div>
      </div>
    );
  }

  const revenueChartData = revenueData.map((d) => ({
    ...d,
    month: formatMonth(d.month),
  }));

  const growthChartData = growthData.map((d) => ({
    ...d,
    month: formatMonth(d.month),
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Admin</h1>
        <p className="mt-2 text-gray-600">
          Visao geral da plataforma Mercado Esperto
        </p>
      </div>

      {/* Welcome Card */}
      {data && (
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            Bem-vindo, {data.admin.email}
          </h2>
          <p className="text-gray-600">
            Funcao:{" "}
            <span className="font-medium uppercase text-blue-600">
              {data.admin.role}
            </span>
          </p>
        </div>
      )}

      {/* KPI Cards */}
      {isLoadingStats ? (
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg bg-white p-6 shadow">
              <div className="mb-4 h-4 w-1/2 rounded bg-gray-200" />
              <div className="h-8 w-3/4 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <>
          {/* User Metrics */}
          <div className="mb-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Users className="size-5" />
              Usuarios
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total de Usuarios"
                value={stats.total_users.toLocaleString("pt-BR")}
                subtitle={`${stats.active_users} ativos`}
                icon={<Users className="size-5" />}
              />
              <StatCard
                title="Usuarios Pagantes"
                value={stats.paying_users.toLocaleString("pt-BR")}
                subtitle={`${stats.trial_users} em trial`}
                icon={<CreditCard className="size-5" />}
              />
              <StatCard
                title="Taxa de Churn"
                value={formatPercent(stats.churn_rate)}
                subtitle="Ultimos 30 dias"
                icon={<TrendingUp className="size-5" />}
              />
              <StatCard
                title="Conversao Trial"
                value={formatPercent(stats.trial_conversion_rate)}
                subtitle="Trial -> Pago"
                icon={<Activity className="size-5" />}
              />
            </div>
          </div>

          {/* Revenue Metrics */}
          <div className="mb-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <DollarSign className="size-5" />
              Receita
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="MRR"
                value={formatCurrency(stats.mrr)}
                subtitle="Receita Recorrente Mensal"
                icon={<DollarSign className="size-5" />}
              />
              <StatCard
                title="ARR"
                value={formatCurrency(stats.arr)}
                subtitle="Receita Recorrente Anual"
                icon={<DollarSign className="size-5" />}
              />
              <StatCard
                title="ARPU"
                value={formatCurrency(stats.arpu)}
                subtitle="Receita Media por Usuario"
                icon={<Users className="size-5" />}
              />
              <StatCard
                title="Notas este Mes"
                value={stats.invoices_this_month.toLocaleString("pt-BR")}
                subtitle={`${stats.total_invoices} total`}
                icon={<FileText className="size-5" />}
              />
            </div>
          </div>
        </>
      ) : null}

      {/* Charts Section */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        {isLoadingRevenue ? (
          <ChartSkeleton />
        ) : (
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-base font-semibold text-gray-900">
              MRR - Receita Recorrente Mensal
            </h3>
            {revenueChartData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChartData}>
                    <defs>
                      <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "#6b7280", fontSize: 12 }}
                      axisLine={{ stroke: "#e5e7eb" }}
                    />
                    <YAxis
                      tick={{ fill: "#6b7280", fontSize: 12 }}
                      axisLine={{ stroke: "#e5e7eb" }}
                      tickFormatter={(v: number) => `R$${v}`}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), "MRR"]}
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="mrr"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#mrrGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-gray-400">
                Nenhum dado de receita disponivel
              </div>
            )}
          </div>
        )}

        {/* Growth Chart */}
        {isLoadingGrowth ? (
          <ChartSkeleton />
        ) : (
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-base font-semibold text-gray-900">
              Crescimento de Usuarios
            </h3>
            {growthChartData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={growthChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "#6b7280", fontSize: 12 }}
                      axisLine={{ stroke: "#e5e7eb" }}
                    />
                    <YAxis
                      tick={{ fill: "#6b7280", fontSize: 12 }}
                      axisLine={{ stroke: "#e5e7eb" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="new_users"
                      name="Novos"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="churned_users"
                      name="Cancelados"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-gray-400">
                Nenhum dado de crescimento disponivel
              </div>
            )}
          </div>
        )}
      </div>

      {/* Operational Metrics */}
      {isLoadingOps ? (
        <div className="mb-8 animate-pulse rounded-lg bg-white p-6 shadow">
          <div className="mb-6 h-5 w-1/4 rounded bg-gray-200" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 rounded bg-gray-100" />
            ))}
          </div>
        </div>
      ) : metrics ? (
        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
            <Zap className="size-5" />
            Metricas Operacionais
          </h3>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {metrics.invoices_today}
              </div>
              <div className="text-xs text-gray-500">Notas hoje</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {metrics.invoices_this_week}
              </div>
              <div className="text-xs text-gray-500">Notas esta semana</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {formatPercent(metrics.ocr_success_rate)}
              </div>
              <div className="text-xs text-gray-500">Taxa de sucesso OCR</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {metrics.avg_processing_time > 0
                  ? `${metrics.avg_processing_time.toFixed(1)}s`
                  : "N/A"}
              </div>
              <div className="text-xs text-gray-500">Tempo medio processamento</div>
            </div>
          </div>
        </div>
      ) : null}

      {/* System Health */}
      <div className="mb-8 rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Server className="size-5" />
            Status dos Servicos
          </h3>
          <button
            onClick={() => { refetchHealth(); }}
            disabled={isLoadingHealth}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
          >
            <RefreshCw
              className={`size-4 ${isLoadingHealth ? "animate-spin" : ""}`}
            />
            Atualizar
          </button>
        </div>

        {isLoadingHealth && !health ? (
          <div className="grid animate-pulse grid-cols-2 gap-4 md:grid-cols-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : health ? (
          <>
            {/* Overall status badge */}
            <div className="mb-4">
              <ServiceStatusBadge
                service={{ status: health.status }}
              />
              <span className="ml-2 text-xs text-gray-400">
                <Clock className="mr-0.5 inline size-3" />
                {new Date(health.checked_at).toLocaleTimeString("pt-BR")}
              </span>
            </div>

            {/* Services grid */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Object.entries(health.services).map(([key, service]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                >
                  <span className="text-sm font-medium text-gray-700">
                    {SERVICE_LABELS[key] || key}
                  </span>
                  <ServiceStatusBadge service={service} />
                </div>
              ))}
            </div>

            {/* Redis memory if available */}
            {health.services.redis?.used_memory_mb != null && (
              <div className="mt-3 text-xs text-gray-400">
                Redis: {health.services.redis.used_memory_mb} MB em uso
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-gray-400">
            Nao foi possivel verificar os servicos
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Acoes Rapidas
        </h3>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/admin/users"
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            <Users className="mr-2 size-4" />
            Gerenciar Usuarios
          </Link>
          <Link
            href="/admin/subscriptions"
            className="inline-flex items-center rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
          >
            <CreditCard className="mr-2 size-4" />
            Assinaturas
          </Link>
          <Link
            href="/admin/payments"
            className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
          >
            <DollarSign className="mr-2 size-4" />
            Pagamentos
          </Link>
        </div>
      </div>
    </div>
  );
}
