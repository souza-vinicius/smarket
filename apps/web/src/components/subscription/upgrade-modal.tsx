"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { X, Zap } from "lucide-react";

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
      if (e.key === "Escape") {onClose();}
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

  if (!isOpen) {return null;}

  const limitMessage =
    limitType === "invoice"
      ? "notas fiscais"
      : "análises de IA";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="animate-in fade-in zoom-in-95 relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 transition-colors hover:text-slate-600"
        >
          <X className="size-5" />
        </button>

        {/* Icon */}
        <div className="mb-4 flex justify-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600">
            <Zap className="size-8 text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="mb-6 text-center">
          <h2 className="mb-2 text-2xl font-bold text-slate-900">
            Limite Atingido
          </h2>
          <p className="text-slate-600">
            Você atingiu o limite de <strong>{limitMessage}</strong> do plano{" "}
            <strong>{currentPlan === "free" ? "Gratuito" : "Básico"}</strong>{" "}
            deste mês.
          </p>
        </div>

        {/* Benefits */}
        <div className="mb-6 rounded-lg bg-emerald-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-emerald-900">
            Faça upgrade para Premium e tenha:
          </h3>
          <ul className="space-y-1 text-sm text-emerald-800">
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
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Mais tarde
          </button>
          <button
            onClick={() => {
              onClose();
              router.push("/pricing");
            }}
            className="flex-1 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:from-emerald-600 hover:to-emerald-700"
          >
            Ver Planos
          </button>
        </div>
      </div>
    </div>
  );
}
