"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCheckout, useSubscription } from "@/hooks/use-subscription";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

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
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
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
      });

      // Redirect to Stripe Checkout
      window.location.href = result.checkout_url;
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Erro ao criar sessão de pagamento");
    }
  };

  const currentPlan = subData?.subscription?.plan || "free";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Escolha o melhor plano para você
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Gerencie suas compras com inteligência artificial
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span
              className={`text-sm font-medium ${
                billingCycle === "monthly" ? "text-slate-900" : "text-slate-500"
              }`}
            >
              Mensal
            </span>
            <button
              onClick={() =>
                setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")
              }
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-emerald-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === "yearly" ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span
              className={`text-sm font-medium ${
                billingCycle === "yearly" ? "text-slate-900" : "text-slate-500"
              }`}
            >
              Anual{" "}
              <span className="text-emerald-600 font-semibold">(~17% OFF)</span>
            </span>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const price =
              billingCycle === "monthly" ? plan.price.monthly : plan.price.yearly;
            const priceLabel =
              billingCycle === "monthly" ? "/mês" : "/ano";

            return (
              <div
                key={plan.plan}
                className={`relative rounded-2xl p-8 ${
                  plan.highlight
                    ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-xl scale-105"
                    : "bg-white text-slate-900 shadow-lg"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-slate-900 px-4 py-1 rounded-full text-sm font-semibold">
                    Recomendado
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p
                    className={`text-sm mb-4 ${
                      plan.highlight ? "text-emerald-50" : "text-slate-600"
                    }`}
                  >
                    {plan.description}
                  </p>
                  <div className="text-4xl font-bold mb-1">
                    R$ {price.toFixed(2).replace(".", ",")}
                    <span className="text-base font-normal">{priceLabel}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2
                        className={`w-5 h-5 flex-shrink-0 ${
                          plan.highlight ? "text-white" : "text-emerald-600"
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
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                    plan.highlight
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
        <div className="text-center mt-12 text-slate-600 text-sm">
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
