"use client";

import { useState } from "react";

import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { useCheckout, useSubscription } from "@/hooks/use-subscription";

const plans = [
  {
    name: "Gratuito",
    price: { monthly: 0, yearly: 0 },
    description: "Trial de 30 dias com acesso completo",
    features: [
      "1 nota fiscal/mês",
      "2 análises IA/mês",
      "Insights avançados (durante trial)",
      "Email suporte",
    ],
    limitations: [
      "Sem exportação CSV/PDF",
      "Sem acesso ilimitado",
    ],
    cta: "Plano Atual",
    plan: "free",
    highlight: false,
  },
  {
    name: "Básico",
    price: { monthly: 9.90, yearly: 99 },
    description: "Para quem gerencia compras do mês",
    features: [
      "5 notas fiscais/mês",
      "5 análises IA/mês",
      "Dashboard de gastos",
      "Histórico completo",
      "Email suporte",
    ],
    limitations: [
      "Sem exportação",
      "Sem insights avançados",
    ],
    cta: "Escolher Básico",
    plan: "basic",
    highlight: false,
  },
  {
    name: "Premium",
    price: { monthly: 19.90, yearly: 199 },
    description: "Controle total + economia máxima",
    features: [
      "Notas fiscais ilimitadas",
      "Análises IA ilimitadas",
      "Insights avançados completos",
      "Exportação CSV/PDF",
      "Suporte prioritário",
      "Previsão de gastos",
      "Alertas de preço",
    ],
    limitations: [],
    cta: "Escolher Premium",
    plan: "premium",
    highlight: true,
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [couponCode, setCouponCode] = useState("");
  const { data: subData } = useSubscription();
  const checkoutMutation = useCheckout();

  const handleSelectPlan = async (plan: string) => {
    if (plan === "free") {
      toast.info("Você já está no plano gratuito");
      return;
    }

    try {
      const result = await checkoutMutation.mutateAsync({
        plan: plan as "basic" | "premium",
        billing_cycle: billingCycle,
        success_url: `${window.location.origin}/dashboard?payment=success`,
        cancel_url: `${window.location.origin}/pricing?payment=cancelled`,
        coupon_code: couponCode.trim() || undefined,
      });

      // Redirect to Stripe Checkout
      window.location.href = result.checkout_url;
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Erro ao criar sessão de pagamento");
    }
  };

  const currentPlan = subData?.subscription?.plan || "free";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold text-slate-900">
            Escolha o melhor plano para você
          </h1>
          <p className="mb-8 text-xl text-slate-600">
            Gerencie suas compras com inteligência artificial
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span
              className={`text-sm font-medium ${billingCycle === "monthly" ? "text-slate-900" : "text-slate-500"
                }`}
            >
              Mensal
            </span>
            <button
              onClick={() => { setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly"); }
              }
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-emerald-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              <span
                className={`inline-block size-4 transform rounded-full bg-white transition-transform ${billingCycle === "yearly" ? "translate-x-6" : "translate-x-1"
                  }`}
              />
            </button>
            <span
              className={`text-sm font-medium ${billingCycle === "yearly" ? "text-slate-900" : "text-slate-500"
                }`}
            >
              Anual{" "}
              <span className="font-semibold text-emerald-600">(~17% OFF)</span>
            </span>
          </div>

          {/* Coupon Input */}
          <div className="mt-6 flex justify-center">
            <div className="relative w-full max-w-xs">
              <input
                type="text"
                placeholder="Tem um cupom de desconto?"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="w-full rounded-full border-slate-200 bg-white py-2 px-4 text-center text-sm shadow-sm transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {plans.map((plan) => {
            const price =
              billingCycle === "monthly" ? plan.price.monthly : plan.price.yearly;
            const priceLabel =
              billingCycle === "monthly" ? "/mês" : "/ano";

            return (
              <div
                key={plan.plan}
                className={`relative rounded-2xl p-8 ${plan.highlight
                    ? "scale-105 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-xl"
                    : "bg-white text-slate-900 shadow-lg"
                  }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 transform rounded-full bg-yellow-400 px-4 py-1 text-sm font-semibold text-slate-900">
                    Recomendado
                  </div>
                )}

                <div className="mb-8 text-center">
                  <h3 className="mb-2 text-2xl font-bold">{plan.name}</h3>
                  <p
                    className={`mb-4 text-sm ${plan.highlight ? "text-emerald-50" : "text-slate-600"
                      }`}
                  >
                    {plan.description}
                  </p>
                  <div className="mb-1 text-4xl font-bold">
                    R$ {price.toFixed(2).replace(".", ",")}
                    <span className="text-base font-normal">{priceLabel}</span>
                  </div>
                </div>

                <ul className="mb-8 space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2
                        className={`size-5 flex-shrink-0 ${plan.highlight ? "text-white" : "text-emerald-600"
                          }`}
                      />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(plan.plan)}
                  disabled={
                    currentPlan === plan.plan || checkoutMutation.isPending
                  }
                  className={`w-full rounded-lg px-6 py-3 font-semibold transition-colors ${plan.highlight
                      ? "bg-white text-emerald-600 hover:bg-emerald-50 disabled:bg-gray-200 disabled:text-gray-500"
                      : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-gray-300 disabled:text-gray-500"
                    } disabled:cursor-not-allowed`}
                >
                  {currentPlan === plan.plan ? "Plano Atual" : plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center text-sm text-slate-600">
          <p>
            Todos os planos incluem trial de 30 dias. Cancele a qualquer momento.
          </p>
          <p className="mt-2">
            Pagamento seguro via Stripe. Apenas cartão de crédito para assinaturas
            recorrentes.
          </p>
        </div>
      </div>
    </div>
  );
}
