"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  Camera,
  Brain,
  TrendingDown,
  Bell,
  FileText,
  Shield,
  BarChart3,
  Tags,
} from "lucide-react";
import { useRef } from "react";

const features = [
  {
    icon: Camera,
    title: "Escaneamento Inteligente",
    description:
      "Tire foto da nota fiscal e nossa IA extrai todos os itens automaticamente. Suporta notas de supermercado, farmácia e muito mais.",
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    icon: Brain,
    title: "IA Analítica",
    description:
      "Receba insights personalizados sobre seus hábitos de compra, identificação de padrões e sugestões para economizar.",
    color: "bg-purple-100 text-purple-600",
  },
  {
    icon: TrendingDown,
    title: "Comparação de Preços",
    description:
      "Compare preços entre diferentes mercados e veja onde você está pagando mais caro. Economize até 30% nas suas compras.",
    color: "bg-blue-100 text-blue-600",
  },
  {
    icon: BarChart3,
    title: "Dashboard Completo",
    description:
      "Visualize seus gastos por categoria, período e mercado. Gráficos intuitivos mostram exatamente para onde vai seu dinheiro.",
    color: "bg-amber-100 text-amber-600",
  },
  {
    icon: Bell,
    title: "Alertas de Preço",
    description:
      "Receba notificações quando produtos que você compra frequentemente estiverem em promoção ou aumentarem de preço.",
    color: "bg-rose-100 text-rose-600",
  },
  {
    icon: Tags,
    title: "Categorização Automática",
    description:
      "A IA classifica automaticamente seus produtos em categorias como alimentos, higiene, bebidas, facilitando o controle.",
    color: "bg-teal-100 text-teal-600",
  },
  {
    icon: FileText,
    title: "Histórico Completo",
    description:
      "Acesse todo seu histórico de compras a qualquer momento. Exporte relatórios em CSV ou PDF para análises detalhadas.",
    color: "bg-indigo-100 text-indigo-600",
  },
  {
    icon: Shield,
    title: "Dados Seguros",
    description:
      "Suas informações são criptografadas e armazenadas com segurança. Estamos em conformidade com a LGPD.",
    color: "bg-cyan-100 text-cyan-600",
  },
];

export function FeaturesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const shouldReduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.5,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  return (
    <section
      id="recursos"
      ref={ref}
      className="relative py-20 lg:py-32 overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-emerald-50/20 to-background" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
          className="text-center mb-16 lg:mb-20"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800 mb-6">
            Recursos Poderosos
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Tudo que você precisa para{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              economizar mais
            </span>
          </h2>
          <p className="text-lg text-foreground-muted max-w-2xl mx-auto">
            Ferramentas inteligentes que transformam suas compras do
            supermercado em oportunidades de economia real
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              whileHover={shouldReduceMotion ? {} : { y: -4, scale: 1.02 }}
              className="group relative rounded-2xl bg-white p-6 lg:p-8 shadow-lg shadow-emerald-900/5 border border-border transition-shadow hover:shadow-xl"
            >
              {/* Icon */}
              <div
                className={`inline-flex items-center justify-center h-12 w-12 rounded-xl ${feature.color} mb-4 transition-transform group-hover:scale-110`}
              >
                <feature.icon className="h-6 w-6" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-foreground-muted leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Feature Highlight */}
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: shouldReduceMotion ? 0 : 0.6, delay: 0.4 }}
          className="mt-16 lg:mt-20"
        >
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-8 lg:p-12">
            {/* Background Pattern */}
            <div className="absolute inset-0 invoice-pattern opacity-10" />

            <div className="relative grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4">
                  Pronto para economizar de verdade?
                </h3>
                <p className="text-emerald-100 mb-6 leading-relaxed">
                  Junte-se a milhares de brasileiros que já descobriram como
                  transformar suas compras em economia real. Cadastre-se agora e
                  ganhe 30 dias grátis com acesso completo.
                </p>
                <div className="flex flex-wrap gap-4">
                  <a
                    href="/register"
                    className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-base font-semibold text-emerald-600 shadow-lg transition-all hover:bg-emerald-50 hover:scale-105 active:scale-95"
                  >
                    Começar Gratuitamente
                  </a>
                  <a
                    href="#precos"
                    className="inline-flex items-center justify-center rounded-full bg-emerald-500/30 px-6 py-3 text-base font-semibold text-white border border-emerald-400/50 transition-all hover:bg-emerald-500/40"
                  >
                    Ver Planos
                  </a>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-6 border border-white/20">
                  <p className="text-4xl font-bold text-white">30%</p>
                  <p className="text-emerald-100 text-sm mt-1">
                    Economia média
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-6 border border-white/20">
                  <p className="text-4xl font-bold text-white">5min</p>
                  <p className="text-emerald-100 text-sm mt-1">
                    Por nota fiscal
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-6 border border-white/20">
                  <p className="text-4xl font-bold text-white">AI</p>
                  <p className="text-emerald-100 text-sm mt-1">
                    Análise inteligente
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-6 border border-white/20">
                  <p className="text-4xl font-bold text-white">100%</p>
                  <p className="text-emerald-100 text-sm mt-1">
                    Automatizado
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
