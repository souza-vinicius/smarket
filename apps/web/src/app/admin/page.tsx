"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import adminApi from "@/lib/admin-api";
import { useAdminDashboardStats } from "@/hooks/use-admin-analytics";
import { toast } from "sonner";
import { Users, DollarSign, TrendingUp, CreditCard, FileText, Activity } from "lucide-react";

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
  trend?: "up" | "down" | "neutral";
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

export default function AdminDashboard() {
  const [data, setData] = useState<AdminRootData | null>(null);
  const [loading, setLoading] = useState(true);
  const { stats, isLoading: isLoadingStats } = useAdminDashboardStats();

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const response = await adminApi.get("/");
        setData(response.data);
      } catch (error: any) {
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Admin</h1>
        <p className="text-gray-600 mt-2">
          Visão geral da plataforma Mercado Esperto
        </p>
      </div>

      {/* Welcome Card */}
      {data && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Bem-vindo, {data.admin.email}
          </h2>
          <p className="text-gray-600">
            Função:{" "}
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
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : stats ? (
        <>
          {/* User Metrics */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuários
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total de Usuários"
                value={stats.total_users.toLocaleString("pt-BR")}
                subtitle={`${stats.active_users} ativos`}
                icon={<Users className="h-5 w-5" />}
              />
              <StatCard
                title="Usuários Pagantes"
                value={stats.paying_users.toLocaleString("pt-BR")}
                subtitle={`${stats.trial_users} em trial`}
                icon={<CreditCard className="h-5 w-5" />}
              />
              <StatCard
                title="Taxa de Churn"
                value={formatPercent(stats.churn_rate)}
                subtitle="Últimos 30 dias"
                icon={<TrendingUp className="h-5 w-5" />}
              />
              <StatCard
                title="Conversão Trial"
                value={formatPercent(stats.trial_conversion_rate)}
                subtitle="Trial → Pago"
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
                subtitle="Receita Média por Usuário"
                icon={<Users className="h-5 w-5" />}
              />
              <StatCard
                title="Notas este Mês"
                value={stats.invoices_this_month.toLocaleString("pt-BR")}
                subtitle={`${stats.total_invoices} total`}
                icon={<FileText className="h-5 w-5" />}
              />
            </div>
          </div>
        </>
      ) : null}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6 mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Ações Rápidas
        </h3>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/admin/users"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Users className="h-4 w-4 mr-2" />
            Gerenciar Usuários
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

      {/* Status Info */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-8">
        <h3 className="text-lg font-semibold text-green-900 mb-2">
          ✅ Todas as Deliveries Implementadas
        </h3>
        <p className="text-green-700 mb-3">
          A área administrativa está completa com todas as funcionalidades:
        </p>
        <ul className="list-disc list-inside text-green-700 space-y-1">
          <li><strong>Delivery 1:</strong> Fundação - RBAC, bloqueio nativo, layout admin</li>
          <li><strong>Delivery 2:</strong> Usuários + Dashboard - CRUD completo, impersonação, KPIs reais</li>
          <li><strong>Delivery 3:</strong> Assinaturas + Pagamentos - Gestão completa, reembolsos via Stripe</li>
        </ul>
      </div>
    </div>
  );
}
