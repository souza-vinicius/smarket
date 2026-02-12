"use client";

import { useState } from "react";
import Link from "next/link";
import { useAdminCoupons, useDeactivateCoupon } from "@/hooks/use-admin-coupons";
import { toast } from "sonner";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function CouponsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isActive, setIsActive] = useState<boolean | undefined>(undefined);

  const { coupons, total, pages, isLoading } = useAdminCoupons({
    page,
    per_page: 20,
    search,
    is_active: isActive,
  });

  const deactivateMutation = useDeactivateCoupon();

  const handleDeactivate = async (couponId: string, code: string) => {
    if (!confirm(`Desativar cupom ${code}?`)) return;

    try {
      await deactivateMutation.mutateAsync(couponId);
      toast.success("Cupom desativado com sucesso.");
    } catch {
      toast.error("Erro ao desativar cupom.");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cupons</h1>
          <p className="text-gray-600 mt-1">
            Gerenciar cupons de desconto e promoções
          </p>
        </div>
        <Link
          href="/admin/coupons/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo Cupom
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
        <div>
          <select
            value={isActive === undefined ? "all" : isActive ? "active" : "inactive"}
            onChange={(e) => {
              const val = e.target.value;
              setIsActive(val === "all" ? undefined : val === "active");
              setPage(1);
            }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="all">Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>
        <div className="flex items-end">
          <span className="text-xs text-gray-400">{total} cupons</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Código
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Descrição
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Desconto
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Validade
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Usos
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-20" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-32" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-16" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-24" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-12" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-12" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-16" />
                    </td>
                  </tr>
                ))
              ) : coupons.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    Nenhum cupom encontrado
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => {
                  const isExpired = coupon.valid_until
                    ? new Date(coupon.valid_until) < new Date()
                    : false;

                  return (
                    <tr key={coupon.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/coupons/${coupon.id}`}
                          className="font-mono text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {coupon.code}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                        {coupon.description || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium">
                        {coupon.discount_type === "percentage"
                          ? `${coupon.discount_value}%`
                          : formatCurrency(coupon.discount_value)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        <div>De: {formatDate(coupon.valid_from)}</div>
                        <div>
                          Até: {coupon.valid_until ? formatDate(coupon.valid_until) : "∞"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {coupon.usage_count}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            coupon.is_active && !isExpired
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {coupon.is_active
                            ? isExpired
                              ? "Expirado"
                              : "Ativo"
                            : "Inativo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link
                            href={`/admin/coupons/${coupon.id}`}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            Ver
                          </Link>
                          {coupon.is_active && (
                            <button
                              onClick={() => handleDeactivate(coupon.id, coupon.code)}
                              disabled={deactivateMutation.isPending}
                              className="text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-50"
                            >
                              Desativar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <span className="text-sm text-gray-600">
              Página {page} de {pages} ({total} cupons)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
