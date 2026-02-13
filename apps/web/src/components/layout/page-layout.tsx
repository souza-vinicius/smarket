"use client";

import { useState } from "react";

import { 
  LayoutDashboard, 
  TrendingUp, 
  Receipt, 
  Package, 
  Lightbulb,
  Plus 
} from "lucide-react";

import { cn } from "@/lib/utils";

import { Header } from "./header";
import { MobileNav, FloatingActionButton } from "./mobile-nav";
import { Sidebar } from "./sidebar";

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
  showFloatingAction?: boolean;
  onFloatingActionClick?: () => void;
  floatingActionLabel?: string;
  className?: string;
}

// Navigation items for mobile nav
const mobileNavItems = [
  {
    label: "Início",
    href: "/dashboard",
    icon: <LayoutDashboard className="size-6" />,
    activeIcon: <LayoutDashboard className="size-6" strokeWidth={2.5} />,
  },
  {
    label: "Notas",
    href: "/invoices",
    icon: <Receipt className="size-6" />,
    activeIcon: <Receipt className="size-6" strokeWidth={2.5} />,
  },
  {
    label: "Produtos",
    href: "/products",
    icon: <Package className="size-6" />,
    activeIcon: <Package className="size-6" strokeWidth={2.5} />,
  },
  {
    label: "Análises",
    href: "/dashboard/analytics",
    icon: <TrendingUp className="size-6" />,
    activeIcon: <TrendingUp className="size-6" strokeWidth={2.5} />,
  },
  {
    label: "Insights",
    href: "/insights",
    icon: <Lightbulb className="size-6" />,
    activeIcon: <Lightbulb className="size-6" strokeWidth={2.5} />,
  },
];

export function PageLayout({
  children,
  title,
  subtitle,
  showBackButton,
  onBack,
  actions,
  showFloatingAction,
  onFloatingActionClick,
  floatingActionLabel = "Adicionar",
  className,
}: PageLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar isOpen={isSidebarOpen} onClose={() => { setIsSidebarOpen(false); }} />
      </div>

      {/* Main Content Area */}
      <div className="lg:pl-[280px]">
        {/* Header */}
        <Header
          title={title}
          subtitle={subtitle}
          showBackButton={showBackButton}
          onBack={onBack}
          actions={actions}
        />

        {/* Page Content */}
        <main
          className={cn(
            "container-responsive py-4 sm:py-6",
            // Add padding for mobile bottom nav
            "pb-24 lg:pb-6",
            className
          )}
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav items={mobileNavItems} />

      {/* Floating Action Button */}
      {showFloatingAction && onFloatingActionClick && (
        <FloatingActionButton
          icon={<Plus className="size-5" />}
          label={floatingActionLabel}
          onClick={onFloatingActionClick}
        />
      )}
    </div>
  );
}

// Auth Layout - For login/register pages
interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        {/* Left Panel - Branding (Desktop only) */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 p-12 lg:flex lg:w-1/2 xl:w-5/12">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: '32px 32px'
            }} />
          </div>

          {/* Decorative Elements */}
          <div className="absolute right-20 top-20 size-64 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute bottom-20 left-20 size-96 rounded-full bg-teal-500/10 blur-3xl" />

          {/* Logo */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm">
                <Receipt className="size-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">Mercado Esperto</span>
            </div>
          </div>

          {/* Hero Content */}
          <div className="relative z-10 my-auto">
            <h1 className="mb-6 text-4xl font-bold leading-tight text-white xl:text-5xl">
              Analista de
              <br />
              Compras Inteligente
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-emerald-100/80">
              Transforme suas notas fiscais em insights valiosos. 
              Economize dinheiro com análises inteligentes de seus gastos.
            </p>
          </div>

          {/* Footer */}
          <div className="relative z-10 text-sm text-emerald-100/40">
            © 2024 Mercado Esperto. Todos os direitos reservados.
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="flex flex-1 flex-col">
          {/* Mobile Header */}
          <div className="p-6 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <Receipt className="size-5" />
              </div>
              <span className="text-xl font-bold text-foreground">Mercado Esperto</span>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
            <div className="w-full max-w-md space-y-8">
              {(title || subtitle) && (
                <div className="text-center">
                  {title && (
                    <h2 className="mb-2 text-3xl font-bold text-foreground">
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p className="text-muted-foreground">{subtitle}</p>
                  )}
                </div>
              )}
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple Layout - For pages without sidebar
interface SimpleLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function SimpleLayout({ children, className }: SimpleLayoutProps) {
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {children}
    </div>
  );
}
