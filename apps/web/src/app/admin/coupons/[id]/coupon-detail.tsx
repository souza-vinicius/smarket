"use client";

import { useState } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { ArrowLeft, Calendar, Users, TrendingUp, Check, X } from "lucide-react";
import { toast } from "sonner";

import {
  useAdminCoupon,
  useCouponStats,
  useCouponUsages,
  useUpdateCoupon,
} from "@/hooks/use-admin-coupons";

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

export default function CouponDetailClient() {
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
      <div className="animate-pulse space-y-6">
        <div className="h-6 w-1/4 rounded bg-gray-200" />
        <div className="h-40 rounded bg-gray-200" />
        <div className="h-60 rounded bg-gray-200" />
      </div>
    );
  }

  if (!coupon) {
    return (
      <div className="py-12 text-center">
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
          className="mb-4 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="size-4" />
          Voltar para cupons
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-mono text-2xl font-bold text-gray-900">
              {coupon.code}
            </h1>
            <p className="mt-1 text-gray-600">{coupon.description || "Sem descrição"}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
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
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="flex items-center gap-3">
              <Users className="size-8 text-blue-500" />
              <div>
                <div className="text-sm text-gray-500">Usos Totais</div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.total_uses}
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="flex items-center gap-3">
              <Check className="size-8 text-green-500" />
              <div>
                <div className="text-sm text-gray-500">Usos Ativos</div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.active_uses}
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="flex items-center gap-3">
              <TrendingUp className="size-8 text-purple-500" />
              <div>
                <div className="text-sm text-gray-500">Receita Total</div>
                <div className="text-xl font-bold text-gray-900">
                  {formatCurrency(stats.total_revenue)}
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="flex items-center gap-3">
              <X className="size-8 text-red-500" />
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
      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Detalhes do Cupom
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <div className="mb-1 text-sm text-gray-500">Tipo de Desconto</div>
            <div className="text-gray-900">
              {coupon.discount_type === "percentage" ? "Percentual" : "Valor Fixo"}
            </div>
          </div>
          <div>
            <div className="mb-1 text-sm text-gray-500">Valor do Desconto</div>
            <div className="font-medium text-gray-900">
              {coupon.discount_type === "percentage"
                ? `${coupon.discount_value}%`
                : formatCurrency(coupon.discount_value)}
            </div>
          </div>
          <div>
            <div className="mb-1 text-sm text-gray-500">Válido De</div>
            <div className="text-gray-900">{formatDate(coupon.valid_from)}</div>
          </div>
          <div>
            <div className="mb-1 text-sm text-gray-500">Válido Até</div>
            <div className="text-gray-900">
              {coupon.valid_until ? formatDate(coupon.valid_until) : "Sem expiração"}
            </div>
          </div>
          <div>
            <div className="mb-1 text-sm text-gray-500">Usos Máximos</div>
            <div className="text-gray-900">
              {coupon.max_uses || "Ilimitado"}
            </div>
          </div>
          <div>
            <div className="mb-1 text-sm text-gray-500">Usos por Usuário</div>
            <div className="text-gray-900">{coupon.max_uses_per_user}</div>
          </div>
          <div>
            <div className="mb-1 text-sm text-gray-500">Compra Mínima</div>
            <div className="text-gray-900">
              {coupon.min_purchase_amount
                ? formatCurrency(coupon.min_purchase_amount)
                : "Sem mínimo"}
            </div>
          </div>
          <div>
            <div className="mb-1 text-sm text-gray-500">Restrições</div>
            <div className="flex flex-wrap gap-1">
              {coupon.first_time_only && (
                <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                  Primeira compra
                </span>
              )}
              {coupon.is_stackable && (
                <span className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700">
                  Acumulável
                </span>
              )}
              {coupon.allow_reuse_after_cancel && (
                <span className="rounded bg-purple-50 px-2 py-0.5 text-xs text-purple-700">
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
      <div className="rounded-lg bg-white shadow">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Usos Recentes ({total})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Data
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Valor Original
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Desconto
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Valor Final
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoadingUsages ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="h-4 w-24 rounded bg-gray-200" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-16 rounded bg-gray-200" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-16 rounded bg-gray-200" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-16 rounded bg-gray-200" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-12 rounded bg-gray-200" />
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
                    <td className="px-4 py-3 font-medium text-red-600">
                      -{formatCurrency(usage.discount_amount)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {formatCurrency(usage.final_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
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
