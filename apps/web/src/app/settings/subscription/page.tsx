"use client";

import { useState } from "react";
import {
  useCancelSubscription,
  usePayments,
  usePortal,
  useSubscription,
} from "@/hooks/use-subscription";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  CheckCircle2,
  CreditCard,
  AlertTriangle,
  ExternalLink,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function SubscriptionSettingsPage() {
  const { data, isLoading } = useSubscription();
  const { data: payments, isLoading: paymentsLoading } = usePayments();
  const portalMutation = usePortal();
  const cancelMutation = useCancelSubscription();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto p-6">
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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Assinatura</h1>
        <p className="text-slate-600">Gerencie seu plano e pagamentos</p>
      </div>

      {/* Current Plan Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-1">
              Plano {planLabels[subscription.plan as keyof typeof planLabels]}
            </h2>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  statusColors[subscription.status as keyof typeof statusColors]
                }`}
              >
                {statusLabels[subscription.status as keyof typeof statusLabels]}
              </span>
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
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <CreditCard className="w-4 h-4" />
              Gerenciar Pagamento
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Trial Info */}
        {subscription.status === "trial" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-blue-900 font-medium mb-1">
                  Trial Premium Ativo
                </p>
                <p className="text-xs text-blue-700">
                  Válido até{" "}
                  {formatDate(new Date(subscription.trial_end), "pt-BR")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Period */}
        {subscription.current_period_end && (
          <div className="text-sm text-slate-600 mb-4">
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
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs text-slate-600 mb-1">Notas fiscais/mês</p>
            <p className="text-2xl font-bold text-slate-900">
              {usage.invoices_used}
              {usage.invoices_limit && (
                <span className="text-sm text-slate-600 font-normal">
                  {" "}
                  / {usage.invoices_limit}
                </span>
              )}
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs text-slate-600 mb-1">Análises IA/mês</p>
            <p className="text-2xl font-bold text-slate-900">
              {usage.ai_analyses_used}
              {usage.ai_analyses_limit && (
                <span className="text-sm text-slate-600 font-normal">
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
              className="flex-1 text-center py-2.5 px-4 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
            >
              Fazer Upgrade
            </Link>
          ) : (
            !subscription.cancelled_at && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                disabled={cancelMutation.isPending}
                className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
              >
                Cancelar Assinatura
              </button>
            )
          )}
        </div>
      </div>

      {/* Payment History */}
      {payments && payments.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Histórico de Pagamentos
          </h2>

          {paymentsLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-100 rounded"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {payment.status === "succeeded" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : payment.status === "failed" ? (
                      <XCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
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
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Cancelar Assinatura?
            </h3>
            <p className="text-sm text-slate-600 mb-6">
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
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2 px-4 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Manter Assinatura
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelMutation.isPending}
                className="flex-1 py-2 px-4 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
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
