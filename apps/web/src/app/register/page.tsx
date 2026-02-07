'use client';

import { useState } from 'react';

import Link from 'next/link';

import { Eye, EyeOff, ArrowRight, Receipt, Search } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';

// Constant-time comparison to prevent timing attacks
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [validationError, setValidationError] = useState('');

  const { register, isRegisterPending, registerError } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (password.length < 8) {
      setValidationError('A senha deve ter pelo menos 8 caracteres');
      return;
    }

    if (!secureCompare(password, confirmPassword)) {
      setValidationError('As senhas não coincidem');
      return;
    }

    if (!acceptedTerms) {
      setValidationError('Você precisa aceitar os termos para continuar');
      return;
    }

    register({ email, password, full_name: fullName });
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden lg:flex-row">
      {/* Left Panel: Brand & Visuals */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-mid to-emerald-dark p-12 lg:flex">
        {/* Background Pattern */}
        <div className="invoice-pattern pointer-events-none absolute inset-0 opacity-20" />

        {/* Logo Section */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg border border-smarket-primary/30 bg-smarket-primary/20 text-smarket-primary backdrop-blur-sm">
            <Receipt className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">SMarket</h1>
        </div>

        {/* Illustration & Hero Text */}
        <div className="relative z-10 my-auto flex flex-col items-start gap-8">
          <div className="relative flex aspect-square w-full max-w-md items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-emerald-dark/90 to-transparent mix-blend-multiply" />
            <div className="rotate-3 transform rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-md">
              <Search className="size-[120px] text-smarket-primary drop-shadow-[0_0_15px_rgba(19,236,128,0.5)]" />
            </div>
          </div>
          <div className="max-w-md">
            <h2 className="mb-2 text-4xl font-bold leading-tight text-white">
              Analista de Compras Inteligente
            </h2>
            <p className="text-lg leading-relaxed text-emerald-100/80">
              Transforme seus dados de faturamento em insights acionáveis com nossa tecnologia de análise avançada.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-sm text-emerald-100/40">
          © 2024 SMarket Inc.
        </div>
      </div>

      {/* Right Panel: Registration Form */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto bg-background-light p-6 sm:p-12 lg:p-24 dark:bg-background-dark">
        <div className="my-auto flex w-full max-w-[420px] flex-col gap-8">
          {/* Mobile Logo */}
          <div className="mb-4 flex items-center gap-2 lg:hidden">
            <div className="flex size-8 items-center justify-center rounded bg-smarket-primary text-emerald-900">
              <Receipt className="size-5" />
            </div>
            <span className="text-xl font-bold text-emerald-900 dark:text-white">SMarket</span>
          </div>

          {/* Header */}
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold tracking-tight text-emerald-950 dark:text-white">
              Crie sua conta
            </h2>
            <p className="text-base text-emerald-700/70 dark:text-emerald-200/60">
              Comece a transformar suas faturas em economia hoje.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {(validationError || registerError) && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {validationError || registerError?.message || 'Erro ao criar conta'}
              </div>
            )}

            {/* Name Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-emerald-900 dark:text-emerald-100" htmlFor="name">
                Nome completo
              </label>
              <input
                id="name"
                type="text"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); }}
                placeholder="Maria Silva"
                required
                className="h-12 w-full rounded-lg border border-gray-200 bg-white px-4 text-emerald-950 transition-all placeholder:text-gray-400 focus:border-smarket-primary focus:outline-none focus:ring-2 focus:ring-smarket-primary/50 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-white"
              />
            </div>

            {/* Email Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-emerald-900 dark:text-emerald-100" htmlFor="email">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); }}
                placeholder="nome@exemplo.com"
                required
                className="h-12 w-full rounded-lg border border-gray-200 bg-white px-4 text-emerald-950 transition-all placeholder:text-gray-400 focus:border-smarket-primary focus:outline-none focus:ring-2 focus:ring-smarket-primary/50 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-white"
              />
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-emerald-900 dark:text-emerald-100" htmlFor="password">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); }}
                  placeholder="••••••••"
                  required
                  className="h-12 w-full rounded-lg border border-gray-200 bg-white px-4 pr-12 text-emerald-950 transition-all placeholder:text-gray-400 focus:border-smarket-primary focus:outline-none focus:ring-2 focus:ring-smarket-primary/50 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => { setShowPassword(!showPassword); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-emerald-600"
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
              <p className="text-xs text-emerald-600/60 dark:text-emerald-300/50">Mínimo de 8 caracteres</p>
            </div>

            {/* Confirm Password Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-emerald-900 dark:text-emerald-100" htmlFor="confirmPassword">
                Confirmar senha
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); }}
                placeholder="••••••••"
                required
                className="h-12 w-full rounded-lg border border-gray-200 bg-white px-4 text-emerald-950 transition-all placeholder:text-gray-400 focus:border-smarket-primary focus:outline-none focus:ring-2 focus:ring-smarket-primary/50 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-white"
              />
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-2 pt-1">
              <div className="flex h-5 items-center">
                <input
                  id="terms"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => { setAcceptedTerms(e.target.checked); }}
                  className="size-4 cursor-pointer rounded border-gray-300 text-smarket-primary focus:ring-smarket-primary/50"
                />
              </div>
              <label className="cursor-pointer text-sm text-emerald-700 dark:text-emerald-200/70" htmlFor="terms">
                Eu aceito os{' '}
                <Link href="/terms" className="font-medium text-emerald-900 hover:underline dark:text-emerald-100">
                  Termos de Uso
                </Link>{' '}
                e{' '}
                <Link href="/privacy" className="font-medium text-emerald-900 hover:underline dark:text-emerald-100">
                  Política de Privacidade
                </Link>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!fullName || !email || !password || !confirmPassword || isRegisterPending}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-smarket-primary text-base font-bold text-emerald-950 shadow-sm shadow-emerald-500/20 transition-all hover:bg-[#0ec76b] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRegisterPending ? (
                <svg className="size-5 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <>
                  <span>Criar Conta</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="border-t border-gray-100 pt-2 text-center dark:border-emerald-900/50">
            <p className="text-sm text-emerald-700/70 dark:text-emerald-200/60">
              Já tem uma conta?{' '}
              <Link
                href="/login"
                className="font-bold text-emerald-700 transition-colors hover:text-emerald-900 dark:text-smarket-primary dark:hover:text-white"
              >
                Entre aqui
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
