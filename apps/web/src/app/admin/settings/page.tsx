"use client";

import { useState } from "react";

import Link from "next/link";

import {
  Settings,
  Shield,
  FileText,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import {
  useAdminSettings,
  useUpdateFeatureFlags,
  useAdminRoles,
} from "@/hooks/use-admin-settings";

interface FlagToggleProps {
  label: string;
  description?: string;
  value: boolean;
  flagKey: string;
  onToggle: (key: string, value: boolean) => void;
  disabled?: boolean;
}

function FlagToggle({
  label,
  description,
  value,
  flagKey,
  onToggle,
  disabled,
}: FlagToggleProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <div className="text-sm font-medium text-gray-900">{label}</div>
        {description && (
          <div className="mt-0.5 text-xs text-gray-500">{description}</div>
        )}
      </div>
      <button
        onClick={() => { onToggle(flagKey, !value); }}
        disabled={disabled}
        className="flex-shrink-0 disabled:opacity-50"
      >
        {value ? (
          <ToggleRight className="size-7 text-blue-600" />
        ) : (
          <ToggleLeft className="size-7 text-gray-400" />
        )}
      </button>
    </div>
  );
}

const FLAG_LABELS: Record<string, { label: string; description?: string }> = {
  ENABLE_SUBSCRIPTION_SYSTEM: {
    label: "Sistema de Assinaturas",
    description: "Habilita limites por plano e cobranca via Stripe",
  },
  ENABLE_CNPJ_FEATURES: {
    label: "Funcionalidades CNPJ",
    description: "Master toggle para validacao e enriquecimento de CNPJ",
  },
  ENABLE_CNPJ_VALIDATION: {
    label: "Validacao de CNPJ",
    description: "Valida digitos verificadores do CNPJ",
  },
  ENABLE_CNPJ_ENRICHMENT: {
    label: "Enriquecimento de CNPJ",
    description: "Busca dados da empresa via BrasilAPI/ReceitaWS",
  },
  ENABLE_AI_ANALYSIS: {
    label: "Analise IA",
    description: "Master toggle para todas as analises de IA",
  },
  IMAGE_OPTIMIZATION_ENABLED: {
    label: "Otimizacao de Imagens",
    description: "Redimensiona fotos antes de enviar ao LLM",
  },
  ENABLE_ANALYSIS_PRICE_ALERT: { label: "Alerta de preco" },
  ENABLE_ANALYSIS_CATEGORY_INSIGHT: { label: "Insight por categoria" },
  ENABLE_ANALYSIS_MERCHANT_PATTERN: { label: "Padrao de loja" },
  ENABLE_ANALYSIS_SUMMARY: { label: "Resumo de compra" },
  ENABLE_ANALYSIS_BUDGET_HEALTH: { label: "Saude do orcamento" },
  ENABLE_ANALYSIS_PER_CAPITA_SPENDING: { label: "Gasto per capita" },
  ENABLE_ANALYSIS_ESSENTIAL_RATIO: { label: "Razao essenciais" },
  ENABLE_ANALYSIS_INCOME_COMMITMENT: { label: "Comprometimento de renda" },
  ENABLE_ANALYSIS_CHILDREN_SPENDING: { label: "Gastos com criancas" },
  ENABLE_ANALYSIS_WHOLESALE_OPPORTUNITY: { label: "Oportunidade atacado" },
  ENABLE_ANALYSIS_SHOPPING_FREQUENCY: { label: "Frequencia de compras" },
  ENABLE_ANALYSIS_SEASONAL_ALERT: { label: "Alerta sazonal" },
  ENABLE_ANALYSIS_SAVINGS_POTENTIAL: { label: "Potencial de economia" },
  ENABLE_ANALYSIS_FAMILY_NUTRITION: { label: "Nutricao familiar" },
};

const SECTION_ORDER = [
  "subscription",
  "cnpj",
  "image_optimization",
  "ai_analysis",
] as const;

const SECTION_LABELS: Record<string, string> = {
  subscription: "Assinaturas",
  cnpj: "CNPJ",
  ai_analysis: "Analises de IA",
  image_optimization: "Otimizacao de Imagens",
};

export default function SettingsPage() {
  const { settings, isLoading } = useAdminSettings();
  const updateFlags = useUpdateFeatureFlags();
  const { roles, isLoading: isLoadingRoles } = useAdminRoles();
  const [pendingChanges, setPendingChanges] = useState<
    Record<string, boolean | number>
  >({});

  const handleToggle = (key: string, value: boolean) => {
    setPendingChanges((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (Object.keys(pendingChanges).length === 0) {
      toast.info("Nenhuma alteracao pendente.");
      return;
    }

    try {
      const result = await updateFlags.mutateAsync(pendingChanges);
      toast.success(result.message);
      setPendingChanges({});
    } catch {
      toast.error("Erro ao atualizar configuracoes.");
    }
  };

  const getEffectiveValue = (key: string, currentValue: unknown): boolean => {
    if (key in pendingChanges) {return pendingChanges[key] as boolean;}
    return currentValue as boolean;
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Settings className="size-6" />
            Configuracoes
          </h1>
          <p className="mt-1 text-gray-600">
            Feature flags e configuracoes do sistema
          </p>
        </div>
        {hasPendingChanges && (
          <button
            onClick={handleSave}
            disabled={updateFlags.isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {updateFlags.isPending
              ? "Salvando..."
              : `Salvar ${Object.keys(pendingChanges).length} alteracao(oes)`}
          </button>
        )}
      </div>

      {/* Warning banner */}
      {hasPendingChanges && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          Alteracoes em feature flags sao aplicadas imediatamente, mas{" "}
          <strong>nao persistem</strong> apos restart do servidor. Para tornar
          permanente, atualize o arquivo <code>.env</code>.
        </div>
      )}

      {/* Feature Flags */}
      {isLoading ? (
        <div className="space-y-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg bg-white p-6 shadow"
            >
              <div className="mb-4 h-5 w-1/4 rounded bg-gray-200" />
              <div className="space-y-3">
                <div className="h-4 w-full rounded bg-gray-100" />
                <div className="h-4 w-3/4 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      ) : settings ? (
        <div className="space-y-6">
          {SECTION_ORDER.map((sectionKey) => {
            const flags = settings.feature_flags[sectionKey];
            if (!flags) {return null;}

            return (
              <div key={sectionKey} className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-2 text-base font-semibold text-gray-900">
                  {SECTION_LABELS[sectionKey] || sectionKey}
                </h2>
                <div className="divide-y divide-gray-100">
                  {Object.entries(flags).map(([key, value]) => {
                    // Only show boolean flags as toggles
                    if (typeof value !== "boolean") {
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between py-3"
                        >
                          <div className="text-sm text-gray-700">
                            {FLAG_LABELS[key]?.label || key}
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {String(value)}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <FlagToggle
                        key={key}
                        label={FLAG_LABELS[key]?.label || key}
                        description={FLAG_LABELS[key]?.description}
                        value={getEffectiveValue(key, value)}
                        flagKey={key}
                        onToggle={handleToggle}
                        disabled={updateFlags.isPending}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Providers (read-only) */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-2 text-base font-semibold text-gray-900">
              Provedores Configurados
            </h2>
            <div className="divide-y divide-gray-100">
              {Object.entries(settings.feature_flags.providers || {}).map(
                ([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="text-sm text-gray-700">
                      {key
                        .replace(/_configured$/, "")
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        value === true || (typeof value === "string" && value)
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {value === true
                        ? "Configurado"
                        : value === false
                          ? "Nao configurado"
                          : String(value)}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Roles Section */}
      <div className="mt-8 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
          <Shield className="size-5" />
          Papeis Administrativos
        </h2>
        {isLoadingRoles ? (
          <div className="animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 rounded bg-gray-100" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {roles.map((role) => (
              <div
                key={role.role}
                className="rounded-lg border border-gray-100 p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium text-gray-900">
                    {role.label}
                  </span>
                  <span className="font-mono text-xs text-gray-400">
                    {role.role}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {role.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="inline-flex rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Link to Audit Logs */}
      <Link
        href="/admin/settings/audit-logs"
        className="mt-6 flex items-center justify-between rounded-lg bg-white p-6 shadow transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <FileText className="size-5 text-gray-400" />
          <div>
            <div className="font-medium text-gray-900">Logs de Auditoria</div>
            <div className="text-sm text-gray-500">
              Visualizar todas as acoes administrativas
            </div>
          </div>
        </div>
        <ChevronRight className="size-5 text-gray-400" />
      </Link>
    </div>
  );
}
