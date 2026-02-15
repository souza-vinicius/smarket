"use client";

import { motion, useInView, useReducedMotion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useRef, useState } from "react";

const faqs = [
  {
    question: "Como a IA extrai dados das notas fiscais?",
    answer:
      "Nossa inteligência artificial avançada analisa a imagem da sua nota fiscal e extrai automaticamente todos os dados relevantes: nome dos produtos, quantidades, preços, data da compra e nome do estabelecimento. O processo leva apenas alguns segundos e atinge 99% de precisão.",
  },
  {
    question: "Minhas notas fiscais estão seguras?",
    answer:
      "Absolutamente! Todos os dados são criptografados em trânsito e em repouso. Nossa infraestrutura segue os mais altos padrões de segurança e estamos em total conformidade com a LGPD (Lei Geral de Proteção de Dados). Seus dados nunca são vendidos ou compartilhados com terceiros.",
  },
  {
    question: "Posso cancelar minha assinatura a qualquer momento?",
    answer:
      "Sim! Você pode cancelar sua assinatura a qualquer momento, sem taxas de cancelamento. Após o cancelamento, você continua tendo acesso ao plano pago até o final do período já pago. Depois disso, sua conta é convertida automaticamente para o plano gratuito.",
  },
  {
    question: "Quais tipos de notas fiscais são suportadas?",
    answer:
      "O MercadoEsperto suporta notas fiscais de supermercados, mercados, farmácias, lojas de conveniência e grande parte do comércio varejista. Aceitamos tanto fotos de notas impressas quanto arquivos XML de notas fiscais eletrônicas (NF-e).",
  },
  {
    question: "Existe limite de notas fiscais no plano gratuito?",
    answer:
      "Sim, o plano gratuito permite o cadastro de 1 nota fiscal por mês e 2 análises de IA. Isso é ideal para testar o aplicativo. Para uso regular, recomendamos os planos Básico (5 notas/mês) ou Premium (ilimitado).",
  },
  {
    question: "Como funciona o trial de 30 dias?",
    answer:
      "Ao criar sua conta, você recebe automaticamente 30 dias de acesso completo a todas as funcionalidades Premium, sem precisar informar cartão de crédito. Durante esse período, você pode testar todas as features e decidir se quer continuar com algum plano pago.",
  },
  {
    question: "Posso exportar meus dados?",
    answer:
      "Sim! Nos planos Básico e Premium, você pode exportar seus dados em formato CSV ou PDF. Isso permite que você faça análises próprias ou compartilhe relatórios com sua família ou contador.",
  },
  {
    question: "O aplicativo funciona em qualquer cidade do Brasil?",
    answer:
      "Sim! O MercadoEsperto funciona em qualquer lugar do Brasil. Desde que você tenha uma nota fiscal válida, nossa IA consegue extrair os dados e ajudar no controle dos seus gastos, independente da sua localização.",
  },
];

export function FAQSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const shouldReduceMotion = useReducedMotion();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.4,
      },
    },
  };

  return (
    <section id="faq" ref={ref} className="relative py-20 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-emerald-50/20 to-background" />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
          className="text-center mb-12 lg:mb-16"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800 mb-6">
            Dúvidas Frequentes
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Perguntas{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              frequentes
            </span>
          </h2>
          <p className="text-lg text-foreground-muted max-w-2xl mx-auto">
            Tire suas dúvidas sobre o MercadoEsperto e descubra como podemos
            ajudar você a economizar
          </p>
        </motion.div>

        {/* FAQ List */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="space-y-4"
        >
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="rounded-xl bg-white border border-border shadow-sm overflow-hidden"
            >
              <button
                onClick={() => toggleQuestion(index)}
                className="w-full flex items-center justify-between p-5 text-left transition-colors hover:bg-muted/50"
              >
                <span className="font-semibold text-foreground pr-4">
                  {faq.question}
                </span>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                  className="flex-shrink-0"
                >
                  <ChevronDown className="h-5 w-5 text-foreground-muted" />
                </motion.div>
              </button>
              <AnimatePresence initial={false}>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      height: { duration: shouldReduceMotion ? 0 : 0.2 },
                      opacity: { duration: shouldReduceMotion ? 0 : 0.15 },
                    }}
                  >
                    <div className="px-5 pb-5">
                      <p className="text-foreground-muted leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: shouldReduceMotion ? 0 : 0.5, delay: 0.3 }}
          className="mt-12 text-center"
        >
          <p className="text-foreground-muted mb-4">
            Ainda tem dúvidas? Estamos aqui para ajudar!
          </p>
          <a
            href="mailto:suporte@mercadoesperto.com.br"
            className="inline-flex items-center gap-2 text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
          >
            Entrar em contato
            <ChevronDown className="h-5 w-5 -rotate-90" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
