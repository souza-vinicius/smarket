"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { Check, X, Sparkles, ArrowRight } from "lucide-react";
import { useRef, useState } from "react";

const plans = [
  {
    name: "Gratuito",
    description: "Perfeito para começar",
    price: { monthly: 0, yearly: 0 },
    features: [
      "1 nota fiscal por mês",
      "2 análises de IA por mês",
      "Dashboard básico",
      "Histórico de 3 meses",
      "Suporte por email",
    ],
    limitations: ["Sem exportação de dados", "Sem alertas de preço"],
    cta: "Começar Grátis",
    href: "/register",
    popular: false,
  },
  {
    name: "Básico",
    description: "Para quem quer economizar",
    price: { monthly: 9.9, yearly: 99 },
    features: [
      "5 notas fiscais por mês",
      "5 análises de IA por mês",
      "Dashboard completo",
      "Histórico ilimitado",
      "Exportação CSV/PDF",
      "Suporte prioritário",
    ],
    limitations: ["Sem previsão de gastos"],
    cta: "Escolher Básico",
    href: "/register?plan=basic",
    popular: false,
  },
  {
    name: "Premium",
    description: "Economia máxima com IA",
    price: { monthly: 19.9, yearly: 199 },
    features: [
      "Notas fiscais ilimitadas",
      "Análises de IA ilimitadas",
      "Dashboard completo + Insights",
      "Histórico ilimitado",
      "Exportação CSV/PDF",
      "Alertas de preço inteligentes",
      "Previsão de gastos mensais",
      "Suporte VIP",
    ],
    limitations: [],
    cta: "Escolher Premium",
    href: "/register?plan=premium",
    popular: true,
  },
];

export function PricingSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const shouldReduceMotion = useReducedMotion();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.6,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  return (
    <section
      id="precos"
      ref={ref}
      className="relative py-20 lg:py-32 overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-emerald-50/30 to-background" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800 mb-6">
            Planos Acessíveis
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Escolha o plano ideal para{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              você
            </span>
          </h2>
          <p className="text-lg text-foreground-muted max-w-2xl mx-auto">
            Comece gratuitamente e evolua conforme suas necessidades. Sem
            compromisso, cancele quando quiser.
          </p>
        </motion.div>

        {/* Billing Toggle */}
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: shouldReduceMotion ? 0 : 0.5, delay: 0.1 }}
          className="flex items-center justify-center gap-4 mb-12"
        >
          <span
            className={`text-sm font-medium ${
              billingCycle === "monthly"
                ? "text-foreground"
                : "text-foreground-muted"
            }`}
          >
            Mensal
          </span>
          <button
            onClick={() =>
              setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")
            }
            className="relative inline-flex h-7 w-14 items-center rounded-full bg-emerald-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                billingCycle === "yearly" ? "translate-x-8" : "translate-x-1"
              }`}
            />
          </button>
          <span
            className={`text-sm font-medium ${
              billingCycle === "yearly"
                ? "text-foreground"
                : "text-foreground-muted"
            }`}
          >
            Anual{" "}
            <span className="text-emerald-600 font-semibold">(~17% OFF)</span>
          </span>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid md:grid-cols-3 gap-6 lg:gap-8"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={itemVariants}
              whileHover={shouldReduceMotion ? {} : { y: -8 }}
              className={`relative rounded-2xl p-6 lg:p-8 ${
                plan.popular
                  ? "bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-2xl shadow-emerald-900/20 scale-105"
                  : "bg-white border border-border shadow-lg shadow-emerald-900/5"
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-4 py-1.5 text-sm font-bold text-amber-900 shadow-lg">
                    <Sparkles className="h-4 w-4" />
                    Mais Popular
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-6">
                <h3
                  className={`text-xl font-bold ${
                    plan.popular ? "text-white" : "text-foreground"
                  }`}
                >
                  {plan.name}
                </h3>
                <p
                  className={`text-sm mt-1 ${
                    plan.popular ? "text-emerald-100" : "text-foreground-muted"
                  }`}
                >
                  {plan.description}
                </p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-4xl font-bold ${
                      plan.popular ? "text-white" : "text-foreground"
                    }`}
                  >
                    R${" "}
                    {billingCycle === "monthly"
                      ? plan.price.monthly.toFixed(2).replace(".", ",")
                      : plan.price.yearly.toFixed(2).replace(".", ",")}
                  </span>
                  <span
                    className={`text-sm ${
                      plan.popular ? "text-emerald-200" : "text-foreground-muted"
                    }`}
                  >
                    {billingCycle === "monthly" ? "/mês" : "/ano"}
                  </span>
                </div>
                {billingCycle === "yearly" && plan.price.yearly > 0 && (
                  <p
                    className={`text-sm mt-1 ${
                      plan.popular ? "text-emerald-200" : "text-foreground-muted"
                    }`}
                  >
                    R${" "}
                    {(plan.price.yearly / 12).toFixed(2).replace(".", ",")} /mês
                    equivalente
                  </p>
                )}
              </div>

              {/* CTA Button */}
              <a
                href={plan.href}
                className={`block w-full text-center rounded-full py-3 px-6 font-semibold transition-all mb-6 ${
                  plan.popular
                    ? "bg-white text-emerald-600 hover:bg-emerald-50 hover:scale-105 active:scale-95"
                    : "bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105 active:scale-95"
                }`}
              >
                {plan.cta}
              </a>

              {/* Features */}
              <div className="space-y-3">
                <p
                  className={`text-sm font-semibold ${
                    plan.popular ? "text-emerald-100" : "text-foreground-muted"
                  }`}
                >
                  Inclui:
                </p>
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center ${
                        plan.popular ? "bg-emerald-500" : "bg-emerald-100"
                      }`}
                    >
                      <Check
                        className={`h-3 w-3 ${
                          plan.popular ? "text-white" : "text-emerald-600"
                        }`}
                      />
                    </div>
                    <span
                      className={`text-sm ${
                        plan.popular ? "text-white" : "text-foreground"
                      }`}
                    >
                      {feature}
                    </span>
                  </div>
                ))}

                {/* Limitations */}
                {plan.limitations.length > 0 && (
                  <>
                    <div className="pt-3 border-t border-border/50" />
                    {plan.limitations.map((limitation) => (
                      <div key={limitation} className="flex items-start gap-3">
                        <div className="flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center bg-foreground-subtle/20">
                          <X className="h-3 w-3 text-foreground-subtle" />
                        </div>
                        <span className="text-sm text-foreground-subtle">
                          {limitation}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: shouldReduceMotion ? 0 : 0.5, delay: 0.5 }}
          className="mt-12 text-center"
        >
          <p className="text-foreground-muted text-sm">
            ✓ 30 dias de trial gratuito em todos os planos pagos
          </p>
          <p className="text-foreground-subtle text-xs mt-2">
            Pagamento seguro via Stripe. Cancele a qualquer momento.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
