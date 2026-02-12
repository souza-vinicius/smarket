"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useAdminCoupon,
  useCouponStats,
  useCouponUsages,
  useUpdateCoupon,
} from "@/hooks/use-admin-coupons";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Users, TrendingUp, Check, X } from "lucide-react";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function CouponDetailPage() {
  const params = useParams();
  const couponId = params.id as string;

  const { coupon, isLoading } = useAdminCoupon(couponId);
  const { stats } = useCouponStats(couponId);
  const { usages, total, isLoading: isLoadingUsages } = useCouponUsages(couponId, {
    page: 1,
    per_page: 10,
  });

  const updateMutation = useUpdateCoupon(couponId);
  const [editMode, setEditMode] = useState(false);
  const [description, setDescription] = useState("");

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({ description });
      toast.success("Cupom atualizado!");
      setEditMode(false);
    } catch {
      toast.error("Erro ao atualizar cupom.");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4" />
        <div className="h-40 bg-gray-200 rounded" />
        <div className="h-60 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!coupon) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Cupom não encontrado</p>
      </div>
    );
  }

  const isExpired = coupon.valid_until
    ? new Date(coupon.valid_until) < new Date()
    : false;

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/coupons"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para cupons
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-mono">
              {coupon.code}
            </h1>
            <p className="text-gray-600 mt-1">{coupon.description || "Sem descrição"}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              coupon.is_active && !isExpired
                ? "bg-green-50 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {coupon.is_active ? (isExpired ? "Expirado" : "Ativo") : "Inativo"}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-sm text-gray-500">Usos Totais</div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.total_uses}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <Check className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-sm text-gray-500">Usos Ativos</div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.active_uses}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div>
                <div className="text-sm text-gray-500">Receita Total</div>
                <div className="text-xl font-bold text-gray-900">
                  {formatCurrency(stats.total_revenue)}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <X className="h-8 w-8 text-red-500" />
              <div>
                <div className="text-sm text-gray-500">Desconto Total</div>
                <div className="text-xl font-bold text-gray-900">
                  {formatCurrency(stats.total_discount)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Coupon Details */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Detalhes do Cupom
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-gray-500 mb-1">Tipo de Desconto</div>
            <div className="text-gray-900">
              {coupon.discount_type === "percentage" ? "Percentual" : "Valor Fixo"}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Valor do Desconto</div>
            <div className="text-gray-900 font-medium">
              {coupon.discount_type === "percentage"
                ? `${coupon.discount_value}%`
                : formatCurrency(coupon.discount_value)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Válido De</div>
            <div className="text-gray-900">{formatDate(coupon.valid_from)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Válido Até</div>
            <div className="text-gray-900">
              {coupon.valid_until ? formatDate(coupon.valid_until) : "Sem expiração"}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Usos Máximos</div>
            <div className="text-gray-900">
              {coupon.max_uses || "Ilimitado"}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Usos por Usuário</div>
            <div className="text-gray-900">{coupon.max_uses_per_user}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Compra Mínima</div>
            <div className="text-gray-900">
              {coupon.min_purchase_amount
                ? formatCurrency(coupon.min_purchase_amount)
                : "Sem mínimo"}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Restrições</div>
            <div className="flex flex-wrap gap-1">
              {coupon.first_time_only && (
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                  Primeira compra
                </span>
              )}
              {coupon.is_stackable && (
                <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">
                  Acumulável
                </span>
              )}
              {coupon.allow_reuse_after_cancel && (
                <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                  Reuso após cancelamento
                </span>
              )}
              {!coupon.first_time_only &&
                !coupon.is_stackable &&
                !coupon.allow_reuse_after_cancel && (
                  <span className="text-xs text-gray-400">Nenhuma</span>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Usages */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Usos Recentes ({total})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Data
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Valor Original
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Desconto
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Valor Final
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoadingUsages ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-24" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-16" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-16" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-16" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-12" />
                    </td>
                  </tr>
                ))
              ) : usages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    Nenhum uso registrado
                  </td>
                </tr>
              ) : (
                usages.map((usage) => (
                  <tr key={usage.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">
                      {formatDateTime(usage.used_at)}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {formatCurrency(usage.original_amount)}
                    </td>
                    <td className="px-4 py-3 text-red-600 font-medium">
                      -{formatCurrency(usage.discount_amount)}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {formatCurrency(usage.final_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          usage.is_active
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {usage.is_active ? "Ativo" : "Cancelado"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
