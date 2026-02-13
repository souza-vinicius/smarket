"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Lightbulb,
  LogOut,
  Receipt,
  Package,
  Settings,
  Shield,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { CountBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isNative } from "@/lib/capacitor";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    label: "Análises",
    href: "/dashboard/analytics",
    icon: <TrendingUp className="w-5 h-5" />,
  },
  {
    label: "Notas Fiscais",
    href: "/invoices",
    icon: <Receipt className="w-5 h-5" />,
  },
  {
    label: "Produtos",
    href: "/products",
    icon: <Package className="w-5 h-5" />,
  },
  {
    label: "Insights",
    href: "/insights",
    icon: <Lightbulb className="w-5 h-5" />,
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen",
          "bg-background-elevated border-r border-border",
          "transition-transform duration-300 ease-out",
          "w-[280px] lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "flex flex-col"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Mercado Esperto
            </span>
          </Link>
          
          {/* Close button - mobile only */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-6">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg",
                    "text-sm font-medium transition-all duration-200",
                    "group relative",
                    isActive
                      ? "bg-primary-subtle text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className={cn(
                    "transition-transform duration-200",
                    isActive ? "scale-110" : "group-hover:scale-105"
                  )}>
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <CountBadge count={item.badge} />
                  )}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Section */}
        <div className="border-t border-border p-4">
          {/* User info */}
          <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-muted/50">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-semibold text-sm flex-shrink-0">
              {user?.full_name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.full_name || "Usuário"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email || "user@example.com"}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-1">
            {/* Admin link - only show if user is admin and not in native app */}
            {user?.is_admin && !isNative() && (
              <Link
                href="/admin"
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg",
                  "text-sm font-medium transition-colors",
                  pathname?.startsWith("/admin")
                    ? "bg-blue-100 text-blue-700"
                    : "text-blue-600 hover:bg-blue-50"
                )}
              >
                <Shield className="w-5 h-5" />
                Admin
              </Link>
            )}
            <Link
              href="/settings"
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg",
                "text-sm font-medium transition-colors",
                pathname === "/settings"
                  ? "bg-primary-subtle text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Settings className="w-5 h-5" />
              Configurações
            </Link>
            <button
              onClick={() => {
                logout();
                onClose?.();
              }}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2 rounded-lg",
                "text-sm font-medium text-destructive",
                "transition-colors hover:bg-destructive-subtle"
              )}
            >
              <LogOut className="w-5 h-5" />
              Sair
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
