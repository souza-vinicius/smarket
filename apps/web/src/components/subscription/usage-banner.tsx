"use client";

import { useSubscription } from "@/hooks/use-subscription";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export function UsageBanner() {
  const { data, isLoading } = useSubscription();

  if (isLoading || !data) return null;

  const { subscription, usage } = data;

  // Don't show banner if unlimited plan
  if (subscription.plan === "premium") return null;

  const invoicePercent = usage.invoices_limit
    ? (usage.invoices_used / usage.invoices_limit) * 100
    : 0;

  const analysisPercent = usage.ai_analyses_limit
    ? (usage.ai_analyses_used / usage.ai_analyses_limit) * 100
    : 0;

  // Show warning if any limit is above 80%
  const showWarning = invoicePercent >= 80 || analysisPercent >= 80;

  if (!showWarning && invoicePercent === 0 && analysisPercent === 0) {
    return null; // Don't show if no usage yet
  }

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        {showWarning && (
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Uso do Plano {subscription.plan === "free" ? "Gratuito" : "Básico"}
          </h3>

          {/* Invoices Progress */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-slate-600 mb-1">
              <span>Notas fiscais</span>
              <span>
                {usage.invoices_used} /{" "}
                {usage.invoices_limit || "ilimitado"}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  invoicePercent >= 100
                    ? "bg-red-500"
                    : invoicePercent >= 80
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(invoicePercent, 100)}%` }}
              />
            </div>
          </div>

          {/* AI Analyses Progress */}
          <div>
            <div className="flex justify-between text-xs text-slate-600 mb-1">
              <span>Análises IA</span>
              <span>
                {usage.ai_analyses_used} /{" "}
                {usage.ai_analyses_limit || "ilimitado"}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  analysisPercent >= 100
                    ? "bg-red-500"
                    : analysisPercent >= 80
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(analysisPercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Upgrade CTA */}
          {showWarning && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-slate-600">
                Você está próximo do limite. Faça upgrade para uso ilimitado!
              </p>
              <Link
                href="/pricing"
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 underline whitespace-nowrap ml-4"
              >
                Ver planos
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
