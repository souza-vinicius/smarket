"use client";

import { useState } from "react";

import Link from "next/link";

import {
  CheckCircle2,
  CreditCard,
  AlertTriangle,
  ExternalLink,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  useCancelSubscription,
  usePayments,
  usePortal,
  useSubscription,
} from "@/hooks/use-subscription";
import { formatCurrency, formatDate } from "@/lib/utils";


export default function SubscriptionSettingsPage() {
  const { data, isLoading } = useSubscription();
  const { data: payments, isLoading: paymentsLoading } = usePayments();
  const portalMutation = usePortal();
  const cancelMutation = useCancelSubscription();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded bg-slate-200" />
          <div className="h-64 rounded bg-slate-200" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-slate-600">Erro ao carregar assinatura.</p>
      </div>
    );
  }

  const { subscription, usage } = data;

  const statusLabels = {
    trial: "Trial Ativo",
    active: "Ativo",
    past_due: "Pagamento Pendente",
    cancelled: "Cancelado",
    expired: "Expirado",
  };

  const statusColors = {
    trial: "text-blue-700 bg-blue-100",
    active: "text-emerald-700 bg-emerald-100",
    past_due: "text-amber-700 bg-amber-100",
    cancelled: "text-red-700 bg-red-100",
    expired: "text-slate-700 bg-slate-100",
  };

  const planLabels = {
    free: "Gratuito",
    basic: "Básico",
    premium: "Premium",
  };

  const handleOpenPortal = async () => {
    try {
      const result = await portalMutation.mutateAsync(
        `${window.location.origin}/settings/subscription`
      );
      window.location.href = result.url;
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail || "Erro ao abrir portal de pagamento"
      );
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await cancelMutation.mutateAsync();
      toast.success("Assinatura cancelada. Acesso mantido até o fim do período.");
      setShowCancelConfirm(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Erro ao cancelar assinatura");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="mb-2 text-3xl font-bold text-slate-900">Assinatura</h1>
        <p className="text-slate-600">Gerencie seu plano e pagamentos</p>
      </div>

      {/* Current Plan Card */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="mb-1 text-xl font-semibold text-slate-900">
              Plano {planLabels[subscription.plan]}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  statusColors[subscription.status]
                }`}
              >
                {statusLabels[subscription.status]}
              </span>
              {subscription.status === "trial" && (
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                  ✨ Ilimitado
                </span>
              )}
              {subscription.billing_cycle && (
                <span className="text-xs text-slate-600">
                  •{" "}
                  {subscription.billing_cycle === "monthly"
                    ? "Mensal"
                    : "Anual"}
                </span>
              )}
            </div>
          </div>

          {subscription.plan !== "free" && !subscription.cancelled_at && (
            <button
              onClick={handleOpenPortal}
              disabled={portalMutation.isPending}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              <CreditCard className="size-4" />
              Gerenciar Pagamento
              <ExternalLink className="size-3" />
            </button>
          )}
        </div>

        {/* Trial Info */}
        {subscription.status === "trial" && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-1 items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-5 flex-shrink-0 text-blue-600" />
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <p className="text-sm font-semibold text-blue-900">
                      Trial Premium Ativo
                    </p>
                  </div>
                  <p className="text-xs leading-relaxed text-blue-700">
                    Aproveite 30 dias com acesso ilimitado a todas as funcionalidades. Válido até{" "}
                    <strong>
                      {formatDate(new Date(subscription.trial_end), "pt-BR")}
                    </strong>
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0">
                <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-blue-200" />
                  </span>
                  30 dias ilimitados
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Current Period */}
        {subscription.current_period_end && (
          <div className="mb-4 text-sm text-slate-600">
            <p>
              {subscription.cancelled_at
                ? "Acesso até: "
                : "Próxima cobrança: "}
              <strong>
                {formatDate(
                  new Date(subscription.current_period_end),
                  "pt-BR"
                )}
              </strong>
            </p>
          </div>
        )}

        {/* Usage Stats */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="mb-1 text-xs text-slate-600">Notas fiscais/mês</p>
            <p className="text-2xl font-bold text-slate-900">
              {usage.invoices_used}
              {usage.invoices_limit && (
                <span className="text-sm font-normal text-slate-600">
                  {" "}
                  / {usage.invoices_limit}
                </span>
              )}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="mb-1 text-xs text-slate-600">Análises IA/mês</p>
            <p className="text-2xl font-bold text-slate-900">
              {usage.ai_analyses_used}
              {usage.ai_analyses_limit && (
                <span className="text-sm font-normal text-slate-600">
                  {" "}
                  / {usage.ai_analyses_limit}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {subscription.plan === "free" || subscription.status === "trial" ? (
            <Link
              href="/pricing"
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-center font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Fazer Upgrade
            </Link>
          ) : (
            !subscription.cancelled_at && (
              <button
                onClick={() => { setShowCancelConfirm(true); }}
                disabled={cancelMutation.isPending}
                className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                Cancelar Assinatura
              </button>
            )
          )}
        </div>
      </div>

      {/* Payment History */}
      {payments && payments.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Histórico de Pagamentos
          </h2>

          {paymentsLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded bg-slate-100" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-4"
                >
                  <div className="flex items-center gap-3">
                    {payment.status === "succeeded" ? (
                      <CheckCircle2 className="size-5 text-emerald-600" />
                    ) : payment.status === "failed" ? (
                      <XCircle className="size-5 text-red-600" />
                    ) : (
                      <AlertTriangle className="size-5 text-amber-600" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {formatCurrency(Number(payment.amount))}
                      </p>
                      <p className="text-xs text-slate-600">
                        {formatDate(new Date(payment.created_at), "pt-BR")} •{" "}
                        {payment.provider}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      payment.status === "succeeded"
                        ? "bg-emerald-100 text-emerald-700"
                        : payment.status === "failed"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {payment.status === "succeeded"
                      ? "Pago"
                      : payment.status === "failed"
                      ? "Falhou"
                      : payment.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-semibold text-slate-900">
              Cancelar Assinatura?
            </h3>
            <p className="mb-6 text-sm text-slate-600">
              Você manterá acesso aos recursos pagos até{" "}
              {subscription.current_period_end &&
                formatDate(
                  new Date(subscription.current_period_end),
                  "pt-BR"
                )}
              . Após essa data, seu plano será rebaixado para gratuito.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowCancelConfirm(false); }}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
              >
                Manter Assinatura
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelMutation.isPending}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {cancelMutation.isPending ? "Cancelando..." : "Confirmar Cancelamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
