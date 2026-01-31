'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Receipt, Eye, EyeOff, TrendingUp, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoginPending, loginError } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ email, password });
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Left Side - Brand Section */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 bg-gradient-to-br from-emerald-600 to-teal-700 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Receipt className="h-8 w-8" />
            </div>
            <span className="text-3xl font-bold">SMarket</span>
          </div>

          {/* Tagline */}
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            Analista de Compras Inteligente
          </h1>
          <p className="text-xl text-emerald-100 mb-12 max-w-lg">
            Transforme suas notas fiscais em insights valiosos e economize dinheiro com inteligência artificial.
          </p>

          {/* Features */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm flex-shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Análise Inteligente</h3>
                <p className="text-emerald-100 text-sm">
                  IA analisa seus gastos e identifica oportunidades de economia
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm flex-shrink-0">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Alertas de Preço</h3>
                <p className="text-emerald-100 text-sm">
                  Receba notificações quando pagar mais caro que a média
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm flex-shrink-0">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Upload Rápido</h3>
                <p className="text-emerald-100 text-sm">
                  Adicione notas fiscais via XML ou QR Code em segundos
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Receipt className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold text-slate-800">SMarket</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              Bem-vindo de volta
            </h2>
            <p className="text-slate-600">
              Entre com sua conta para continuar
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {loginError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                {loginError.message || 'Erro ao fazer login. Verifique suas credenciais.'}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12"
            />

            <div className="relative">
              <Input
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[38px] text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Lembrar-me</span>
              </label>
              <Link
                href="#"
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                Esqueceu a senha?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full h-12 text-base font-semibold"
              isLoading={isLoginPending}
              disabled={!email || !password}
            >
              Entrar
            </Button>
          </form>

          {/* Register Link */}
          <p className="mt-8 text-center text-sm text-slate-600">
            Não tem uma conta?{' '}
            <Link
              href="/register"
              className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Criar conta gratuita
            </Link>
          </p>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-slate-400">
            Ao entrar, você concorda com nossos{' '}
            <Link href="#" className="hover:text-slate-600">
              Termos de Serviço
            </Link>{' '}
            e{' '}
            <Link href="#" className="hover:text-slate-600">
              Política de Privacidade
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
