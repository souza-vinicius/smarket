'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight, Receipt, Search } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

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

    if (password !== confirmPassword) {
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
    <div className="flex flex-col lg:flex-row h-screen w-full overflow-hidden">
      {/* Left Panel: Brand & Visuals */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-emerald-mid to-emerald-dark relative flex-col justify-between p-12 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 invoice-pattern opacity-20 pointer-events-none" />

        {/* Logo Section */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-smarket-primary/20 rounded-lg backdrop-blur-sm border border-smarket-primary/30 text-smarket-primary">
            <Receipt className="w-6 h-6" />
          </div>
          <h1 className="text-white text-2xl font-bold tracking-tight">SMarket</h1>
        </div>

        {/* Illustration & Hero Text */}
        <div className="relative z-10 flex flex-col items-start gap-8 my-auto">
          <div className="w-full max-w-md aspect-square relative flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-dark/90 to-transparent mix-blend-multiply rounded-2xl" />
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl shadow-2xl transform rotate-3">
              <Search className="w-[120px] h-[120px] text-smarket-primary drop-shadow-[0_0_15px_rgba(19,236,128,0.5)]" />
            </div>
          </div>
          <div className="max-w-md">
            <h2 className="text-4xl font-bold text-white leading-tight mb-2">
              Analista de Compras Inteligente
            </h2>
            <p className="text-emerald-100/80 text-lg leading-relaxed">
              Transforme seus dados de faturamento em insights acionáveis com nossa tecnologia de análise avançada.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-emerald-100/40 text-sm">
          © 2024 SMarket Inc.
        </div>
      </div>

      {/* Right Panel: Registration Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-24 bg-background-light dark:bg-background-dark overflow-y-auto">
        <div className="w-full max-w-[420px] flex flex-col gap-8 my-auto">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-8 h-8 bg-smarket-primary rounded text-emerald-900">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-emerald-900 dark:text-white">SMarket</span>
          </div>

          {/* Header */}
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold text-emerald-950 dark:text-white tracking-tight">
              Crie sua conta
            </h2>
            <p className="text-emerald-700/70 dark:text-emerald-200/60 text-base">
              Comece a transformar suas faturas em economia hoje.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {(validationError || registerError) && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
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
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Maria Silva"
                required
                className="w-full h-12 px-4 rounded-lg border border-gray-200 dark:border-emerald-800 bg-white dark:bg-emerald-900/30 text-emerald-950 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-smarket-primary/50 focus:border-smarket-primary transition-all"
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
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@exemplo.com"
                required
                className="w-full h-12 px-4 rounded-lg border border-gray-200 dark:border-emerald-800 bg-white dark:bg-emerald-900/30 text-emerald-950 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-smarket-primary/50 focus:border-smarket-primary transition-all"
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
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-12 px-4 pr-12 rounded-lg border border-gray-200 dark:border-emerald-800 bg-white dark:bg-emerald-900/30 text-emerald-950 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-smarket-primary/50 focus:border-smarket-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-12 px-4 rounded-lg border border-gray-200 dark:border-emerald-800 bg-white dark:bg-emerald-900/30 text-emerald-950 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-smarket-primary/50 focus:border-smarket-primary transition-all"
              />
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-2 pt-1">
              <div className="flex h-5 items-center">
                <input
                  id="terms"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-smarket-primary focus:ring-smarket-primary/50 cursor-pointer"
                />
              </div>
              <label className="text-sm text-emerald-700 dark:text-emerald-200/70 cursor-pointer" htmlFor="terms">
                Eu aceito os{' '}
                <Link href="#" className="font-medium text-emerald-900 dark:text-emerald-100 hover:underline">
                  Termos de Uso
                </Link>{' '}
                e{' '}
                <Link href="#" className="font-medium text-emerald-900 dark:text-emerald-100 hover:underline">
                  Política de Privacidade
                </Link>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!fullName || !email || !password || !confirmPassword || isRegisterPending}
              className="w-full h-12 mt-4 rounded-lg bg-smarket-primary hover:bg-[#0ec76b] text-emerald-950 font-bold text-base shadow-sm shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRegisterPending ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <>
                  <span>Criar Conta</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center pt-2 border-t border-gray-100 dark:border-emerald-900/50">
            <p className="text-sm text-emerald-700/70 dark:text-emerald-200/60">
              Já tem uma conta?{' '}
              <Link
                href="/login"
                className="font-bold text-emerald-700 hover:text-emerald-900 dark:text-smarket-primary dark:hover:text-white transition-colors"
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
