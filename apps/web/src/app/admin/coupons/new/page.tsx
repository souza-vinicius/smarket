"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateCoupon } from "@/hooks/use-admin-coupons";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { CouponCreate, CouponType } from "@/types/admin";

export default function NewCouponPage() {
  const router = useRouter();
  const createMutation = useCreateCoupon();

  const [formData, setFormData] = useState<CouponCreate>({
    code: "",
    description: "",
    discount_type: "percentage",
    discount_value: 0,
    max_uses: null,
    max_uses_per_user: 1,
    min_purchase_amount: null,
    first_time_only: false,
    allow_reuse_after_cancel: false,
    is_stackable: false,
    applicable_plans: [],
    applicable_cycles: [],
    valid_from: new Date().toISOString().split("T")[0],
    valid_until: null,
    is_active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!formData.code.trim()) {
      toast.error("Código do cupom é obrigatório");
      return;
    }

    if (formData.discount_value <= 0) {
      toast.error("Valor do desconto deve ser maior que zero");
      return;
    }

    if (
      formData.discount_type === "percentage" &&
      formData.discount_value > 100
    ) {
      toast.error("Desconto percentual não pode exceder 100%");
      return;
    }

    try {
      // Convert dates to ISO format
      const payload: CouponCreate = {
        ...formData,
        code: formData.code.toUpperCase(),
        valid_from: new Date(formData.valid_from).toISOString(),
        valid_until: formData.valid_until
          ? new Date(formData.valid_until).toISOString()
          : null,
      };

      await createMutation.mutateAsync(payload);
      toast.success("Cupom criado com sucesso!");
      router.push("/admin/coupons");
    } catch (error: any) {
      const message =
        error?.response?.data?.detail || "Erro ao criar cupom";
      toast.error(message);
    }
  };

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
        <h1 className="text-2xl font-bold text-gray-900">Novo Cupom</h1>
        <p className="text-gray-600 mt-1">
          Criar um novo cupom de desconto
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Informações Básicas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
                  placeholder="PROMO2026"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Promoção de lançamento"
                />
              </div>
            </div>
          </div>

          {/* Discount */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Desconto
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Desconto *
                </label>
                <select
                  value={formData.discount_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discount_type: e.target.value as CouponType,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="percentage">Percentual</option>
                  <option value="fixed">Valor Fixo (R$)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={formData.discount_type === "percentage" ? "100" : undefined}
                  value={formData.discount_value}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discount_value: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
            </div>
          </div>

          {/* Usage Limits */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Limites de Uso
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usos Totais
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.max_uses || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_uses: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Ilimitado"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usos por Usuário *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.max_uses_per_user}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_uses_per_user: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Compra Mínima (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.min_purchase_amount || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      min_purchase_amount: e.target.value
                        ? parseFloat(e.target.value)
                        : null,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Sem mínimo"
                />
              </div>
            </div>
          </div>

          {/* Validity */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Validade
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Válido De *
                </label>
                <input
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) =>
                    setFormData({ ...formData, valid_from: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Válido Até
                </label>
                <input
                  type="date"
                  value={formData.valid_until || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      valid_until: e.target.value || null,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Sem data de expiração"
                />
              </div>
            </div>
          </div>

          {/* Advanced Options */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Opções Avançadas
            </h2>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.first_time_only}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      first_time_only: e.target.checked,
                    })
                  }
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">
                  Apenas primeira compra
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_stackable}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      is_stackable: e.target.checked,
                    })
                  }
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">
                  Acumulável com outros cupons
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.allow_reuse_after_cancel}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      allow_reuse_after_cancel: e.target.checked,
                    })
                  }
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">
                  Permitir reuso após cancelamento
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      is_active: e.target.checked,
                    })
                  }
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Cupom ativo</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Link
              href="/admin/coupons"
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? "Criando..." : "Criar Cupom"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
