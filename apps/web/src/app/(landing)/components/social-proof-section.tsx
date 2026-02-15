"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { Star, TrendingUp, Users, Receipt, Award } from "lucide-react";
import { useRef } from "react";

const stats = [
  {
    icon: Users,
    value: "10.000+",
    label: "Usuários Ativos",
    color: "bg-blue-100 text-blue-600",
  },
  {
    icon: Receipt,
    value: "500K+",
    label: "Notas Fiscais",
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    icon: TrendingUp,
    value: "R$ 2M+",
    label: "Em Economias",
    color: "bg-purple-100 text-purple-600",
  },
  {
    icon: Award,
    value: "4.9/5",
    label: "Avaliação Média",
    color: "bg-amber-100 text-amber-600",
  },
];

const testimonials = [
  {
    name: "Maria Silva",
    role: "Dona de Casa",
    content:
      "Consegui economizar R$ 300 no primeiro mês! A IA me ajudou a identificar onde estava gastando demais sem perceber.",
    avatar: "MS",
    rating: 5,
  },
  {
    name: "João Santos",
    role: "Morador Solo",
    content:
      "Finalmente entendo para onde vai meu dinheiro. O app é super intuitivo e as notificações de preço são incríveis!",
    avatar: "JS",
    rating: 5,
  },
  {
    name: "Ana Costa",
    role: "Mãe de Família",
    content:
      "Gerencio as compras de 5 pessoas e o MercadoEsperto facilitou muito. Consigo ver exatamente quanto gasto em cada categoria.",
    avatar: "AC",
    rating: 5,
  },
];

export function SocialProofSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const shouldReduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.1,
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
    <section ref={ref} className="relative py-20 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-emerald-50/30 to-background" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Stats Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-20"
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              className="text-center"
            >
              <div
                className={`inline-flex items-center justify-center h-14 w-14 rounded-2xl ${stat.color} mb-4`}
              >
                <stat.icon className="h-7 w-7" />
              </div>
              <p className="text-3xl lg:text-4xl font-bold text-foreground">
                {stat.value}
              </p>
              <p className="text-sm text-foreground-muted mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Testimonials Header */}
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: shouldReduceMotion ? 0 : 0.5, delay: 0.3 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            O que nossos usuários dizem
          </h2>
          <p className="text-lg text-foreground-muted max-w-2xl mx-auto">
            Junte-se a milhares de pessoas que já estão economizando com inteligência
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid md:grid-cols-3 gap-6 lg:gap-8"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              variants={itemVariants}
              whileHover={shouldReduceMotion ? {} : { y: -4 }}
              className="relative rounded-2xl bg-white p-6 lg:p-8 shadow-lg shadow-emerald-900/5 border border-border"
            >
              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-5 w-5 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>

              {/* Quote */}
              <p className="text-foreground-muted leading-relaxed mb-6">
                &ldquo;{testimonial.content}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-sm">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {testimonial.name}
                  </p>
                  <p className="text-sm text-foreground-muted">
                    {testimonial.role}
                  </p>
                </div>
              </div>

              {/* Decorative Quote Mark */}
              <div className="absolute top-4 right-4 text-6xl font-serif text-emerald-100 leading-none select-none">
                &rdquo;
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: shouldReduceMotion ? 0 : 0.5, delay: 0.6 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-8 opacity-60"
        >
          <div className="flex items-center gap-2 text-sm text-foreground-muted">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <span>LGPD Compliant</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-foreground-muted">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
            </svg>
            <span>Dados Criptografados</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-foreground-muted">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
            <span>Disponível no Brasil</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
