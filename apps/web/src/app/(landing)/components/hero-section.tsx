"use client";

import Image from "next/image";
import Link from "next/link";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles, TrendingDown, Shield } from "lucide-react";

export function HeroSection() {
  const shouldReduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.1,
        delayChildren: shouldReduceMotion ? 0 : 0.2,
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

  const floatAnimation = shouldReduceMotion
    ? undefined
    : {
        y: [0, -10, 0],
        transition: {
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut" as const,
        },
      };

  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-b from-emerald-50/50 via-background to-background pt-16">
      {/* Background Pattern */}
      <div className="absolute inset-0 invoice-pattern opacity-50" />

      {/* Gradient Orbs */}
      <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-emerald-400/20 blur-[100px]" />
      <div className="absolute -right-40 top-1/3 h-[400px] w-[400px] rounded-full bg-teal-400/15 blur-[80px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 lg:pt-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left Content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div variants={itemVariants} className="mb-6 inline-flex">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800 border border-emerald-200">
                <Sparkles className="h-4 w-4" />
                Inteligência Artificial para suas compras
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground"
            >
              Controle seus gastos no{" "}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                supermercado
              </span>{" "}
              com inteligência
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={itemVariants}
              className="mt-6 text-lg sm:text-xl text-foreground-muted max-w-2xl mx-auto lg:mx-0 leading-relaxed"
            >
              Escaneie suas notas fiscais, acompanhe seus gastos em tempo real e
              receba insights de IA para economizar de verdade. Simples, rápido
              e automático.
            </motion.p>

            {/* Value Props */}
            <motion.div
              variants={itemVariants}
              className="mt-8 flex flex-wrap justify-center lg:justify-start gap-4"
            >
              <div className="flex items-center gap-2 text-sm text-foreground-muted">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                  <TrendingDown className="h-4 w-4 text-emerald-600" />
                </div>
                <span>Economize até 30%</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground-muted">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                  <Shield className="h-4 w-4 text-emerald-600" />
                </div>
                <span>Dados 100% seguros</span>
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              variants={itemVariants}
              className="mt-10 flex flex-col sm:flex-row justify-center lg:justify-start gap-4"
            >
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:shadow-emerald-600/30 hover:scale-105 active:scale-95"
              >
                Começar Gratuitamente
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="#como-funciona"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-foreground border border-border shadow-sm transition-all hover:bg-muted hover:scale-105 active:scale-95"
              >
                Ver Como Funciona
              </Link>
            </motion.div>

            {/* Trust Badge */}
            <motion.p
              variants={itemVariants}
              className="mt-6 text-sm text-foreground-subtle"
            >
              ✓ 30 dias grátis sem cartão de crédito
            </motion.p>
          </motion.div>

          {/* Right Content - Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.8,
              delay: shouldReduceMotion ? 0 : 0.3,
              ease: [0.22, 1, 0.36, 1] as const,
            }}
            className="relative"
          >
            {/* Main Dashboard Card */}
            <motion.div
              animate={floatAnimation}
              className="relative rounded-2xl bg-white shadow-2xl shadow-emerald-900/10 border border-border overflow-hidden"
            >
              {/* Dashboard Header */}
              <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <span className="ml-2 text-xs text-foreground-muted">
                  Dashboard MercadoEsperto
                </span>
              </div>

              {/* Dashboard Content */}
              <div className="p-6 space-y-4">
                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-100">
                    <p className="text-xs text-emerald-600 font-medium">
                      Total Gasto
                    </p>
                    <p className="text-lg font-bold text-emerald-900">
                      R$ 1.247,00
                    </p>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3 border border-blue-100">
                    <p className="text-xs text-blue-600 font-medium">
                      Notas Fiscais
                    </p>
                    <p className="text-lg font-bold text-blue-900">12</p>
                  </div>
                  <div className="rounded-xl bg-purple-50 p-3 border border-purple-100">
                    <p className="text-xs text-purple-600 font-medium">
                      Economia
                    </p>
                    <p className="text-lg font-bold text-purple-900">R$ 89</p>
                  </div>
                </div>

                {/* Chart Placeholder */}
                <div className="rounded-xl bg-muted/50 p-4 border border-border">
                  <p className="text-sm font-medium text-foreground mb-3">
                    Gastos por Categoria
                  </p>
                  <div className="flex items-end gap-2 h-24">
                    {[65, 45, 80, 55, 40, 70, 35].map((height, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t bg-gradient-to-t from-emerald-500 to-emerald-400 transition-all hover:opacity-80"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-foreground-muted">
                    <span>Seg</span>
                    <span>Ter</span>
                    <span>Qua</span>
                    <span>Qui</span>
                    <span>Sex</span>
                    <span>Sáb</span>
                    <span>Dom</span>
                  </div>
                </div>

                {/* Recent Invoices */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Notas Recentes
                  </p>
                  {[
                    { store: "Supermercado Extra", value: "R$ 245,50", date: "Hoje" },
                    { store: "Carrefour", value: "R$ 189,90", date: "Ontem" },
                  ].map((invoice, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-white border border-border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <span className="text-xs font-bold text-emerald-600">
                            {invoice.store[0]}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {invoice.store}
                          </p>
                          <p className="text-xs text-foreground-muted">
                            {invoice.date}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600">
                        {invoice.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Floating Cards */}
            <motion.div
              animate={{
                y: shouldReduceMotion ? 0 : [0, -15, 0],
                transition: {
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5,
                },
              }}
              className="absolute -left-8 top-1/4 rounded-xl bg-white p-3 shadow-xl shadow-emerald-900/10 border border-border"
            >
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <TrendingDown className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-foreground-muted">Economia</p>
                  <p className="text-sm font-bold text-emerald-600">+12%</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              animate={{
                y: shouldReduceMotion ? 0 : [0, 15, 0],
                transition: {
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                },
              }}
              className="absolute -right-4 bottom-1/4 rounded-xl bg-white p-3 shadow-xl shadow-emerald-900/10 border border-border"
            >
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-foreground-muted">Insights IA</p>
                  <p className="text-sm font-bold text-purple-600">5 novos</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:block"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex flex-col items-center gap-2"
        >
          <span className="text-xs text-foreground-muted">Role para explorar</span>
          <div className="h-10 w-6 rounded-full border-2 border-border flex items-start justify-center p-2">
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="h-1.5 w-1.5 rounded-full bg-emerald-600"
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
