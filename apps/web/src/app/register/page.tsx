'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Receipt, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

    register({ email, password, full_name: fullName });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Receipt className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Crie sua conta</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Comece a economizar com insights inteligentes
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {(validationError || registerError) && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {validationError || registerError?.message || 'Erro ao criar conta'}
            </div>
          )}

          <Input
            label="Nome Completo"
            type="text"
            placeholder="João Silva"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <Input
            label="Email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="relative">
            <Input
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText="Mínimo de 8 caracteres"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-8 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          <Input
            label="Confirmar Senha"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="terms"
              className="mt-1 rounded border-input"
              required
            />
            <label htmlFor="terms" className="text-sm text-muted-foreground">
              Eu concordo com os{' '}
              <Link href="#" className="text-primary hover:underline">
                Termos de Serviço
              </Link>{' '}
              e{' '}
              <Link href="#" className="text-primary hover:underline">
                Política de Privacidade
              </Link>
            </label>
          </div>

          <Button
            type="submit"
            className="w-full"
            isLoading={isRegisterPending}
            disabled={!fullName || !email || !password || !confirmPassword}
          >
            Criar Conta
          </Button>
        </form>

        {/* Login Link */}
        <p className="text-center text-sm text-muted-foreground">
          Já tem uma conta?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Entre aqui
          </Link>
        </p>
      </div>
    </div>
  );
}
