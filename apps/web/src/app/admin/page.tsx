"use client";

import { useEffect, useState } from "react";
import adminApi from "@/lib/admin-api";
import { toast } from "sonner";

interface AdminRootData {
  message: string;
  admin: {
    id: string;
    email: string;
    role: string;
  };
}

export default function AdminDashboard() {
  const [data, setData] = useState<AdminRootData | null>(null);
  const [loading, setLoading] = useState(true);

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
            Função: <span className="font-medium text-blue-600 uppercase">{data.admin.role}</span>
          </p>
        </div>
      )}

      {/* Placeholder for KPIs - Will be implemented in Delivery 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total de Usuários</div>
          <div className="text-3xl font-bold text-gray-900">-</div>
          <div className="text-xs text-gray-500 mt-2">Dados em breve</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">MRR</div>
          <div className="text-3xl font-bold text-gray-900">-</div>
          <div className="text-xs text-gray-500 mt-2">Dados em breve</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Taxa de Churn</div>
          <div className="text-3xl font-bold text-gray-900">-</div>
          <div className="text-xs text-gray-500 mt-2">Dados em breve</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Conversão Trial</div>
          <div className="text-3xl font-bold text-gray-900">-</div>
          <div className="text-xs text-gray-500 mt-2">Dados em breve</div>
        </div>
      </div>

      {/* Status Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          🚧 Delivery 1: Foundation Complete
        </h3>
        <p className="text-blue-700 mb-3">
          A infraestrutura base da área administrativa foi implementada. Próximas entregas:
        </p>
        <ul className="list-disc list-inside text-blue-700 space-y-1">
          <li><strong>Delivery 2:</strong> Gestão de Usuários + Dashboard com dados reais</li>
          <li><strong>Delivery 3:</strong> Gestão de Assinaturas + Pagamentos + Métricas SaaS</li>
        </ul>
      </div>
    </div>
  );
}
