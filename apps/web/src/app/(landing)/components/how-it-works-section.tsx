"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { Camera, Sparkles, LineChart, ArrowRight } from "lucide-react";
import { useRef } from "react";

const steps = [
  {
    icon: Camera,
    number: "01",
    title: "Escaneie sua nota fiscal",
    description:
      "Tire uma foto ou faça upload da sua nota fiscal. Nossa IA extrai automaticamente todos os itens, preços e dados do mercado.",
    color: "from-emerald-400 to-emerald-600",
    bgColor: "bg-emerald-50",
  },
  {
    icon: Sparkles,
    number: "02",
    title: "IA organiza tudo",
    description:
      "Nossa inteligência artificial categoriza automaticamente seus produtos, identifica padrões e detecta oportunidades de economia.",
    color: "from-blue-400 to-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    icon: LineChart,
    number: "03",
    title: "Economize com insights",
    description:
      "Receba alertas de preços, compare valores entre mercados e descubra quanto você pode economizar em cada compra.",
    color: "from-purple-400 to-purple-600",
    bgColor: "bg-purple-50",
  },
];

export function HowItWorksSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const shouldReduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.2,
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
      id="como-funciona"
      ref={ref}
      className="relative py-20 lg:py-32 overflow-hidden"
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
          className="text-center mb-16 lg:mb-20"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800 mb-6">
            Simples e Rápido
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Como funciona o{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              MercadoEsperto
            </span>
          </h2>
          <p className="text-lg text-foreground-muted max-w-2xl mx-auto">
            Três passos simples para transformar suas compras em economia real
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="relative"
        >
          {/* Connection Line - Desktop */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-200 via-blue-200 to-purple-200 -translate-y-1/2" />

          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                variants={itemVariants}
                className="relative"
              >
                <div className="relative rounded-2xl bg-white p-8 lg:p-10 shadow-xl shadow-emerald-900/5 border border-border h-full">
                  {/* Step Number */}
                  <div
                    className={`absolute -top-4 left-8 inline-flex items-center justify-center h-8 px-3 rounded-full bg-gradient-to-r ${step.color} text-white text-sm font-bold`}
                  >
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div
                    className={`inline-flex items-center justify-center h-16 w-16 rounded-2xl ${step.bgColor} mb-6`}
                  >
                    <step.icon
                      className={`h-8 w-8 bg-gradient-to-r ${step.color} bg-clip-text`}
                      style={{
                        color:
                          index === 0
                            ? "#10b981"
                            : index === 1
                              ? "#3b82f6"
                              : "#a855f7",
                      }}
                    />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-foreground mb-3">
                    {step.title}
                  </h3>
                  <p className="text-foreground-muted leading-relaxed">
                    {step.description}
                  </p>

                  {/* Arrow - Mobile */}
                  {index < steps.length - 1 && (
                    <div className="flex justify-center mt-6 lg:hidden">
                      <ArrowRight className="h-6 w-6 text-foreground-subtle rotate-90" />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: shouldReduceMotion ? 0 : 0.5, delay: 0.6 }}
          className="mt-16 text-center"
        >
          <p className="text-foreground-muted mb-4">
            Pronto para começar a economizar?
          </p>
          <a
            href="/register"
            className="inline-flex items-center gap-2 text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
          >
            Criar conta gratuita
            <ArrowRight className="h-5 w-5" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
