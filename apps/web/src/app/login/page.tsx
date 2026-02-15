"use client";

import { useState } from "react";

import Link from "next/link";

import { ArrowRight } from "lucide-react";

import { AuthLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { InfoCard } from "@/components/ui/card";
import { Input, PasswordInput } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";

/**
 * Converts API errors to user-friendly messages in Portuguese
 */
function getErrorMessage(error: Error | null): string {
  if (!error) return "";

  const message = error.message.toLowerCase();

  // Check for specific error patterns
  if (message.includes("sessão expirada") || message.includes("refresh token")) {
    return "Sua sessão expirou. Por favor, faça login novamente.";
  }

  if (message.includes("401") || message.includes("unauthorized") || message.includes("credenciais")) {
    return "E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.";
  }

  if (message.includes("network") || message.includes("rede")) {
    return "Erro de conexão. Verifique sua internet e tente novamente.";
  }

  if (message.includes("500") || message.includes("server") || message.includes("servidor")) {
    return "Nosso servidor está temporariamente indisponível. Tente novamente em alguns instantes.";
  }

  // Default fallback message
  return "Ocorreu um erro ao fazer login. Por favor, tente novamente.";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoginPending, loginError } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ email, password });
  };

  return (
    <AuthLayout title="Bem-vindo de volta" subtitle="Entre com sua conta para continuar">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Error Message */}
        {loginError && (
          <InfoCard
            variant="error"
            icon={
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="Erro ao entrar"
            description={getErrorMessage(loginError)}
          />
        )}

        {/* Email */}
        <Input
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); }}
          placeholder="seu@email.com"
          required
          autoComplete="email"
        />

        {/* Password */}
        <div className="space-y-2">
          <PasswordInput
            label="Senha"
            value={password}
            onChange={(e) => { setPassword(e.target.value); }}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="size-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-muted-foreground">Lembrar de mim</span>
            </label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary transition-colors hover:text-primary-hover"
            >
              Esqueceu a senha?
            </Link>
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          fullWidth
          size="lg"
          isLoading={isLoginPending}
          disabled={!email || !password}
          rightIcon={<ArrowRight className="size-4" />}
        >
          Entrar
        </Button>
      </form>

      {/* Footer */}
      <div className="border-t border-border pt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Ainda não tem uma conta?{" "}
          <Link
            href="/register"
            className="font-medium text-primary transition-colors hover:text-primary-hover"
          >
            Registre-se
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
