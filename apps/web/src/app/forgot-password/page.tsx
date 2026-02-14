"use client";

import { useState } from "react";

import Link from "next/link";

import { ArrowLeft, Mail } from "lucide-react";

import { AuthLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { InfoCard } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: integrate with backend password reset endpoint
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <AuthLayout
        title="E-mail enviado"
        subtitle="Verifique sua caixa de entrada"
      >
        <InfoCard
          variant="success"
          icon={<Mail className="size-5" />}
          title="Instruções enviadas"
          description={`Se o e-mail ${email} estiver cadastrado, você receberá instruções para redefinir sua senha.`}
        />

        <div className="pt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
          >
            <ArrowLeft className="size-4" />
            Voltar para o login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Esqueceu a senha?"
      subtitle="Informe seu e-mail e enviaremos instruções para redefinir sua senha"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); }}
          placeholder="seu@email.com"
          required
          autoComplete="email"
        />

        <Button
          type="submit"
          fullWidth
          size="lg"
          disabled={!email}
        >
          Enviar instruções
        </Button>
      </form>

      <div className="border-t border-border pt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
        >
          <ArrowLeft className="size-4" />
          Voltar para o login
        </Link>
      </div>
    </AuthLayout>
  );
}
