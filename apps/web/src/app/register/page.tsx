"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AuthLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { InfoCard } from "@/components/ui/card";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  
  const { register, isRegisterPending, registerError } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) return;
    register({ email, password, full_name: fullName });
  };

  const passwordsMatch = password === confirmPassword && password.length > 0;
  const canSubmit = 
    fullName && 
    email && 
    password && 
    confirmPassword && 
    passwordsMatch && 
    acceptTerms;

  return (
    <AuthLayout title="Criar conta" subtitle="Comece a economizar com o SMarket">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Error Message */}
        {registerError && (
          <InfoCard
            variant="error"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="Erro ao criar conta"
            description={registerError.message || "Verifique os dados e tente novamente."}
          />
        )}

        {/* Full Name */}
        <Input
          label="Nome completo"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Seu nome completo"
          required
          autoComplete="name"
        />

        {/* Email */}
        <Input
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          required
          autoComplete="email"
        />

        {/* Password */}
        <PasswordInput
          label="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          required
          hint="Use pelo menos 8 caracteres com letras e números"
        />

        {/* Confirm Password */}
        <PasswordInput
          label="Confirme a senha"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          required
          error={confirmPassword && !passwordsMatch ? "As senhas não coincidem" : undefined}
        />

        {/* Terms */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm text-muted-foreground leading-relaxed">
            Aceito os{" "}
            <Link href="/terms" className="text-primary hover:underline">
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Política de Privacidade
            </Link>
          </span>
        </label>

        {/* Submit */}
        <Button
          type="submit"
          fullWidth
          size="lg"
          isLoading={isRegisterPending}
          disabled={!canSubmit}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Criar conta
        </Button>
      </form>

      {/* Footer */}
      <div className="text-center pt-6 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Já tem uma conta?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:text-primary-hover transition-colors"
          >
            Entre
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
