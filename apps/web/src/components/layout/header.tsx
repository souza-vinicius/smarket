"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Bell,
  Search,
  ArrowLeft,
  Plus,
  ChevronDown,
  LogOut,
  Settings,
  User,
} from "lucide-react";

import { CountBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/modal";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
}

export function Header({
  title,
  subtitle,
  showBackButton = false,
  onBack,
  actions,
}: HeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <>
      <header
        className={cn(
          "pt-safe sticky top-0 z-30",
          "bg-background/95 backdrop-blur-lg",
          "border-b border-border"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 lg:px-6">
          {/* Left Section */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {/* Back button */}
            {showBackButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="-ml-1 flex-shrink-0"
                aria-label="Voltar"
              >
                <ArrowLeft className="size-5" />
              </Button>
            )}

            {/* Title */}
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-foreground sm:text-xl">
                {title}
              </h1>
              {subtitle && (
                <p className="hidden truncate text-sm text-muted-foreground sm:block">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Page Actions */}
            {actions}

            {/* Search - desktop only */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Buscar..."
                className={cn(
                  "h-10 w-64 rounded-lg pl-10 pr-4",
                  "border-0 bg-muted",
                  "text-sm text-foreground placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-primary/20",
                  "transition-all duration-200",
                  "focus:w-80"
                )}
              />
            </div>

            {/* Search button - mobile only */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Buscar"
            >
              <Search className="size-5" />
            </Button>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setIsNotificationsOpen(true); }}
              className="relative"
              aria-label="Notificações"
            >
              <Bell className="size-5" />
              <span className="absolute right-1.5 top-1.5">
                <CountBadge count={3} variant="destructive" />
              </span>
            </Button>

            {/* User Menu - desktop */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => { setIsUserMenuOpen(!isUserMenuOpen); }}
                className={cn(
                  "flex items-center gap-2 rounded-lg py-1 pl-2 pr-1",
                  "border border-border bg-background-elevated",
                  "transition-colors hover:bg-muted",
                  "focus:outline-none focus:ring-2 focus:ring-ring"
                )}
              >
                <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-semibold text-white">
                  {user?.full_name?.charAt(0).toUpperCase() || "U"}
                </div>
                <span className="hidden text-sm font-medium text-foreground lg:block">
                  {user?.full_name?.split(" ")[0] || "Usuário"}
                </span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </button>

              {/* Dropdown */}
              {isUserMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => { setIsUserMenuOpen(false); }}
                  />
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 animate-scale-in rounded-xl border border-border bg-background-elevated py-2 shadow-xl">
                    <div className="mb-2 border-b border-border px-4 py-3">
                      <p className="text-sm font-medium text-foreground">
                        {user?.full_name || "Usuário"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user?.email || "user@example.com"}
                      </p>
                    </div>
                    <Link
                      href="/settings"
                      onClick={() => { setIsUserMenuOpen(false); }}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                    >
                      <Settings className="size-4" />
                      Configurações
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setIsUserMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-destructive transition-colors hover:bg-destructive-subtle"
                    >
                      <LogOut className="size-4" />
                      Sair
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* User avatar - mobile only */}
            <button
              onClick={() => { setIsUserMenuOpen(true); }}
              className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-semibold text-white sm:hidden"
              aria-label="Menu do usuário"
            >
              {user?.full_name?.charAt(0).toUpperCase() || "U"}
            </button>
          </div>
        </div>

        {/* Mobile subtitle below title */}
        {subtitle && (
          <div className="px-4 pb-3 sm:hidden">
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        )}
      </header>

      {/* User Drawer - Mobile */}
      <Drawer
        isOpen={isUserMenuOpen}
        onClose={() => { setIsUserMenuOpen(false); }}
        title="Menu"
        position="bottom"
        size="md"
      >
        <div className="space-y-1">
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-muted p-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-lg font-semibold text-white">
              {user?.full_name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div>
              <p className="font-medium text-foreground">
                {user?.full_name || "Usuário"}
              </p>
              <p className="text-sm text-muted-foreground">
                {user?.email || "user@example.com"}
              </p>
            </div>
          </div>

          <Link
            href="/settings"
            onClick={() => { setIsUserMenuOpen(false); }}
            className="flex items-center gap-3 rounded-xl p-4 transition-colors hover:bg-muted"
          >
            <Settings className="size-5 text-muted-foreground" />
            <span className="text-foreground">Configurações</span>
          </Link>

          <button
            onClick={() => {
              logout();
              setIsUserMenuOpen(false);
            }}
            className="flex w-full items-center gap-3 rounded-xl p-4 text-destructive transition-colors hover:bg-destructive-subtle"
          >
            <LogOut className="size-5" />
            <span>Sair</span>
          </button>
        </div>
      </Drawer>

      {/* Notifications Drawer */}
      <Drawer
        isOpen={isNotificationsOpen}
        onClose={() => { setIsNotificationsOpen(false); }}
        title="Notificações"
        position="right"
        size="md"
      >
        <div className="space-y-4">
          {/* Sample notifications */}
          <div className="rounded-xl bg-primary-subtle p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/20">
                <Bell className="size-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Nova nota fiscal processada
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sua nota do Mercado Livre foi processada com sucesso.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Há 5 minutos
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-warning-subtle p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-warning/20">
                <Bell className="size-4 text-warning" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Preço acima da média
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Detectamos um preço 20% acima da média em sua última compra.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Há 1 hora
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                <Bell className="size-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Bem-vindo ao Mercado Esperto!
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Comece adicionando sua primeira nota fiscal.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Ontem
                </p>
              </div>
            </div>
          </div>
        </div>
      </Drawer>
    </>
  );
}
