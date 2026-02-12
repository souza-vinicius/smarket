"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Menu,
  Search,
  ArrowLeft,
  Plus,
  ChevronDown,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CountBadge } from "@/components/ui/badge";
import { Drawer } from "@/components/ui/modal";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
  onMenuClick?: () => void;
}

export function Header({
  title,
  subtitle,
  showBackButton = false,
  onBack,
  actions,
  onMenuClick,
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
          "sticky top-0 z-30 pt-safe",
          "bg-background/95 backdrop-blur-lg",
          "border-b border-border"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 lg:px-6">
          {/* Left Section */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Menu button - mobile only */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="lg:hidden flex-shrink-0"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Back button */}
            {showBackButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="flex-shrink-0 -ml-1"
                aria-label="Voltar"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}

            {/* Title */}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground truncate hidden sm:block">
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Buscar..."
                className={cn(
                  "h-10 w-64 pl-10 pr-4 rounded-lg",
                  "bg-muted border-0",
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
              <Search className="w-5 h-5" />
            </Button>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsNotificationsOpen(true)}
              className="relative"
              aria-label="Notificações"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5">
                <CountBadge count={3} variant="destructive" />
              </span>
            </Button>

            {/* User Menu - desktop */}
            <div className="hidden sm:block relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={cn(
                  "flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg",
                  "border border-border bg-background-elevated",
                  "hover:bg-muted transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-ring"
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-semibold">
                  {user?.full_name?.charAt(0).toUpperCase() || "U"}
                </div>
                <span className="text-sm font-medium text-foreground hidden lg:block">
                  {user?.full_name?.split(" ")[0] || "Usuário"}
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>

              {/* Dropdown */}
              {isUserMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-56 py-2 bg-background-elevated rounded-xl border border-border shadow-xl z-50 animate-scale-in">
                    <div className="px-4 py-3 border-b border-border mb-2">
                      <p className="text-sm font-medium text-foreground">
                        {user?.full_name || "Usuário"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.email || "user@example.com"}
                      </p>
                    </div>
                    <Link
                      href="/settings"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Configurações
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setIsUserMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-destructive hover:bg-destructive-subtle transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sair
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* User avatar - mobile only */}
            <button
              onClick={() => setIsUserMenuOpen(true)}
              className="sm:hidden flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-semibold"
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
        onClose={() => setIsUserMenuOpen(false)}
        title="Menu"
        position="bottom"
        size="md"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-3 p-4 bg-muted rounded-xl mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-semibold text-lg">
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
            onClick={() => setIsUserMenuOpen(false)}
            className="flex items-center gap-3 p-4 rounded-xl hover:bg-muted transition-colors"
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
            <span className="text-foreground">Configurações</span>
          </Link>

          <button
            onClick={() => {
              logout();
              setIsUserMenuOpen(false);
            }}
            className="flex w-full items-center gap-3 p-4 rounded-xl text-destructive hover:bg-destructive-subtle transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </button>
        </div>
      </Drawer>

      {/* Notifications Drawer */}
      <Drawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        title="Notificações"
        position="right"
        size="md"
      >
        <div className="space-y-4">
          {/* Sample notifications */}
          <div className="p-4 bg-primary-subtle rounded-xl">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Nova nota fiscal processada
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Sua nota do Mercado Livre foi processada com sucesso.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Há 5 minutos
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-warning-subtle rounded-xl">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center">
                <Bell className="w-4 h-4 text-warning" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Preço acima da média
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Detectamos um preço 20% acima da média em sua última compra.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Há 1 hora
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Bell className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Bem-vindo ao Mercado Esperto!
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Comece adicionando sua primeira nota fiscal.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
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
