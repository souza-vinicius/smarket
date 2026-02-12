"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import adminApi from "@/lib/admin-api";
import {
  useAdminDashboardStats,
  useAdminRevenueChart,
  useAdminGrowthChart,
  useAdminOperationalMetrics,
  useSystemHealth,
} from "@/hooks/use-admin-analytics";
import { toast } from "sonner";
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
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">{title}</div>
        <div className="text-gray-400">{icon}</div>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-2">{subtitle}</div>}
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
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      {service.status === "not_configured" ? "N/A" : service.status}
      {service.latency_ms != null && (
        <span className="text-[10px] opacity-75">{service.latency_ms}ms</span>
      )}
    </span>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-1/3 mb-6" />
      <div className="h-[300px] bg-gray-100 rounded" />
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
      <div className="flex items-center justify-center min-h-screen">
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
        <p className="text-gray-600 mt-2">
          Visao geral da plataforma Mercado Esperto
        </p>
      </div>

      {/* Welcome Card */}
      {data && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Bem-vindo, {data.admin.email}
          </h2>
          <p className="text-gray-600">
            Funcao:{" "}
            <span className="font-medium text-blue-600 uppercase">
              {data.admin.role}
            </span>
          </p>
        </div>
      )}

      {/* KPI Cards */}
      {isLoadingStats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="h-8 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <>
          {/* User Metrics */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuarios
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total de Usuarios"
                value={stats.total_users.toLocaleString("pt-BR")}
                subtitle={`${stats.active_users} ativos`}
                icon={<Users className="h-5 w-5" />}
              />
              <StatCard
                title="Usuarios Pagantes"
                value={stats.paying_users.toLocaleString("pt-BR")}
                subtitle={`${stats.trial_users} em trial`}
                icon={<CreditCard className="h-5 w-5" />}
              />
              <StatCard
                title="Taxa de Churn"
                value={formatPercent(stats.churn_rate)}
                subtitle="Ultimos 30 dias"
                icon={<TrendingUp className="h-5 w-5" />}
              />
              <StatCard
                title="Conversao Trial"
                value={formatPercent(stats.trial_conversion_rate)}
                subtitle="Trial -> Pago"
                icon={<Activity className="h-5 w-5" />}
              />
            </div>
          </div>

          {/* Revenue Metrics */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Receita
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="MRR"
                value={formatCurrency(stats.mrr)}
                subtitle="Receita Recorrente Mensal"
                icon={<DollarSign className="h-5 w-5" />}
              />
              <StatCard
                title="ARR"
                value={formatCurrency(stats.arr)}
                subtitle="Receita Recorrente Anual"
                icon={<DollarSign className="h-5 w-5" />}
              />
              <StatCard
                title="ARPU"
                value={formatCurrency(stats.arpu)}
                subtitle="Receita Media por Usuario"
                icon={<Users className="h-5 w-5" />}
              />
              <StatCard
                title="Notas este Mes"
                value={stats.invoices_this_month.toLocaleString("pt-BR")}
                subtitle={`${stats.total_invoices} total`}
                icon={<FileText className="h-5 w-5" />}
              />
            </div>
          </div>
        </>
      ) : null}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        {isLoadingRevenue ? (
          <ChartSkeleton />
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
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
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                Nenhum dado de receita disponivel
              </div>
            )}
          </div>
        )}

        {/* Growth Chart */}
        {isLoadingGrowth ? (
          <ChartSkeleton />
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
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
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                Nenhum dado de crescimento disponivel
              </div>
            )}
          </div>
        )}
      </div>

      {/* Operational Metrics */}
      {isLoadingOps ? (
        <div className="bg-white rounded-lg shadow p-6 mb-8 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/4 mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded" />
            ))}
          </div>
        </div>
      ) : metrics ? (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Metricas Operacionais
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Server className="h-5 w-5" />
            Status dos Servicos
          </h3>
          <button
            onClick={() => refetchHealth()}
            disabled={isLoadingHealth}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoadingHealth ? "animate-spin" : ""}`}
            />
            Atualizar
          </button>
        </div>

        {isLoadingHealth && !health ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg" />
            ))}
          </div>
        ) : health ? (
          <>
            {/* Overall status badge */}
            <div className="mb-4">
              <ServiceStatusBadge
                service={{ status: health.status }}
              />
              <span className="text-xs text-gray-400 ml-2">
                <Clock className="h-3 w-3 inline mr-0.5" />
                {new Date(health.checked_at).toLocaleTimeString("pt-BR")}
              </span>
            </div>

            {/* Services grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(health.services).map(([key, service]) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100"
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
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Acoes Rapidas
        </h3>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/admin/users"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Users className="h-4 w-4 mr-2" />
            Gerenciar Usuarios
          </Link>
          <Link
            href="/admin/subscriptions"
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Assinaturas
          </Link>
          <Link
            href="/admin/payments"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Pagamentos
          </Link>
        </div>
      </div>
    </div>
  );
}
