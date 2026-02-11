"use client";

import { useRouter } from "next/navigation";
import { X, Zap } from "lucide-react";
import { useEffect } from "react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: "invoice" | "analysis";
  currentPlan: string;
}

export function UpgradeModal({
  isOpen,
  onClose,
  limitType,
  currentPlan,
}: UpgradeModalProps) {
  const router = useRouter();

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const limitMessage =
    limitType === "invoice"
      ? "notas fiscais"
      : "análises de IA";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
            <Zap className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Limite Atingido
          </h2>
          <p className="text-slate-600">
            Você atingiu o limite de <strong>{limitMessage}</strong> do plano{" "}
            <strong>{currentPlan === "free" ? "Gratuito" : "Básico"}</strong>{" "}
            deste mês.
          </p>
        </div>

        {/* Benefits */}
        <div className="bg-emerald-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-emerald-900 mb-2">
            Faça upgrade para Premium e tenha:
          </h3>
          <ul className="text-sm text-emerald-800 space-y-1">
            <li>✓ Notas fiscais ilimitadas</li>
            <li>✓ Análises de IA ilimitadas</li>
            <li>✓ Exportação CSV/PDF</li>
            <li>✓ Insights avançados completos</li>
            <li>✓ Suporte prioritário</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
          >
            Mais tarde
          </button>
          <button
            onClick={() => {
              onClose();
              router.push("/pricing");
            }}
            className="flex-1 py-2.5 px-4 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/30"
          >
            Ver Planos
          </button>
        </div>
      </div>
    </div>
  );
}
