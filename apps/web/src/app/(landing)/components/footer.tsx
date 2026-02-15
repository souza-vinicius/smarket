"use client";

import Link from "next/link";

import { motion, useReducedMotion } from "framer-motion";
import { Receipt, Instagram, Twitter, Linkedin, Github } from "lucide-react";

const footerLinks = {
  produto: [
    { label: "Como Funciona", href: "#como-funciona" },
    { label: "Recursos", href: "#recursos" },
    { label: "Preços", href: "#precos" },
    { label: "FAQ", href: "#faq" },
  ],
  empresa: [
    { label: "Sobre Nós", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Carreiras", href: "/careers" },
    { label: "Contato", href: "/contact" },
  ],
  legal: [
    { label: "Termos de Uso", href: "/terms" },
    { label: "Privacidade", href: "/privacy" },
    { label: "LGPD", href: "/lgpd" },
  ],
};

const socialLinks = [
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Github, href: "#", label: "GitHub" },
];

export function Footer() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <footer className="relative bg-foreground text-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 invoice-pattern opacity-5" />

      <div className="relative">
        {/* CTA Section */}
        <div className="border-b border-white/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
            <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 p-8 lg:p-12">
              <div className="grid lg:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4">
                    Pronto para começar a economizar?
                  </h3>
                  <p className="text-emerald-100">
                    Cadastre-se agora e ganhe 30 dias grátis com acesso completo
                    a todas as funcionalidades.
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 lg:justify-end">
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-base font-semibold text-emerald-600 shadow-lg transition-all hover:bg-emerald-50 hover:scale-105 active:scale-95"
                  >
                    Criar Conta Grátis
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-full bg-emerald-500/30 px-8 py-4 text-base font-semibold text-white border border-emerald-400/50 transition-all hover:bg-emerald-500/40"
                  >
                    Já tenho conta
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Footer */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-4 lg:col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600">
                  <Receipt className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold">
                  Mercado<span className="text-emerald-400">Esperto</span>
                </span>
              </Link>
              <p className="text-white/60 text-sm leading-relaxed mb-6 max-w-sm">
                Controle financeiro inteligente para suas compras de
                supermercado. Economize tempo e dinheiro com a ajuda da
                inteligência artificial.
              </p>

              {/* Social Links */}
              <div className="flex gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white/60 transition-all hover:bg-white/20 hover:text-white"
                  >
                    <social.icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Produto</h4>
              <ul className="space-y-3">
                {footerLinks.produto.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/60 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Empresa</h4>
              <ul className="space-y-3">
                {footerLinks.empresa.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/60 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-3">
                {footerLinks.legal.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/60 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-white/40">
              © {new Date().getFullYear()} MercadoEsperto. Todos os direitos
              reservados.
            </p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2 text-sm text-white/40">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Todos os sistemas operacionais
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
