"use client";

import { useSubscription } from "@/hooks/use-subscription";
import { Clock, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

export function TrialBanner() {
  const { data, isLoading } = useSubscription();

  const daysRemaining = useMemo(() => {
    if (!data?.subscription) return null;

    const { subscription } = data;

    // Only show for trial status
    if (subscription.status !== "trial") return null;

    const now = new Date();
    const trialEnd = new Date(subscription.trial_end);
    const diff = trialEnd.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    return days > 0 ? days : 0;
  }, [data]);

  if (isLoading || daysRemaining === null) return null;

  // Different colors based on days remaining
  const urgency =
    daysRemaining <= 3
      ? "urgent"
      : daysRemaining <= 7
      ? "warning"
      : "info";

  const styles = {
    urgent: {
      bg: "bg-gradient-to-r from-red-50 to-orange-50",
      border: "border-red-200",
      text: "text-red-900",
      icon: "text-red-600",
      badge: "bg-red-100 text-red-700",
    },
    warning: {
      bg: "bg-gradient-to-r from-amber-50 to-yellow-50",
      border: "border-amber-200",
      text: "text-amber-900",
      icon: "text-amber-600",
      badge: "bg-amber-100 text-amber-700",
    },
    info: {
      bg: "bg-gradient-to-r from-blue-50 to-indigo-50",
      border: "border-blue-200",
      text: "text-blue-900",
      icon: "text-blue-600",
      badge: "bg-blue-100 text-blue-700",
    },
  };

  const style = styles[urgency];

  return (
    <div
      className={`${style.bg} ${style.border} border rounded-lg p-4 mb-6 shadow-sm`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {urgency === "info" ? (
            <Sparkles className={`w-5 h-5 ${style.icon}`} />
          ) : (
            <Clock className={`w-5 h-5 ${style.icon}`} />
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`text-sm font-semibold ${style.text}`}>
              Trial Premium Ativo
            </h3>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${style.badge}`}
            >
              {daysRemaining} {daysRemaining === 1 ? "dia" : "dias"} restantes
            </span>
          </div>

          <p className={`text-xs ${style.text} mb-3`}>
            {urgency === "urgent"
              ? "Seu trial está acabando! Escolha um plano agora para não perder acesso aos insights avançados."
              : urgency === "warning"
              ? "Seu trial está quase no fim. Escolha um plano para continuar com todos os recursos."
              : "Você está testando o plano Premium gratuitamente. Explore todos os recursos enquanto o trial durar!"}
          </p>

          <Link
            href="/pricing"
            className={`inline-flex items-center text-xs font-medium ${style.icon} hover:underline`}
          >
            Escolher plano agora →
          </Link>
        </div>
      </div>
    </div>
  );
}
