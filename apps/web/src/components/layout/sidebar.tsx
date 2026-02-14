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

import { CountBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { isNative } from "@/lib/capacitor";
import { cn } from "@/lib/utils";

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
    icon: <LayoutDashboard className="size-5" />,
  },
  {
    label: "Análises",
    href: "/dashboard/analytics",
    icon: <TrendingUp className="size-5" />,
  },
  {
    label: "Notas Fiscais",
    href: "/invoices",
    icon: <Receipt className="size-5" />,
  },
  {
    label: "Produtos",
    href: "/products",
    icon: <Package className="size-5" />,
  },
  {
    label: "Insights",
    href: "/insights",
    icon: <Lightbulb className="size-5" />,
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
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen",
          "border-r border-border bg-background-elevated",
          "transition-transform duration-300 ease-out",
          "w-[280px] lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "flex flex-col"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
              <Receipt className="size-5" />
            </div>
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-xl font-bold text-transparent">
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
            <X className="size-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-6">
          <div className="space-y-1">
            {navItems.map((item) => {
              // Exact match or child route (but not if there's a more specific match)
              const isExactMatch = pathname === item.href;
              const isChildRoute = pathname.startsWith(`${item.href}/`);

              // Check if there's a more specific nav item that matches
              const hasMoreSpecificMatch = navItems.some(
                (other) => other.href !== item.href &&
                           other.href.length > item.href.length &&
                           pathname.startsWith(other.href)
              );

              const isActive = isExactMatch || (isChildRoute && !hasMoreSpecificMatch);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5",
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
                    <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Section */}
        <div className="border-t border-border p-4">
          {/* User info */}
          <div className="mb-4 flex items-center gap-3 rounded-lg bg-muted/50 p-2">
            <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-semibold text-white">
              {user?.full_name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {user?.full_name || "Usuário"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
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
                  "flex items-center gap-3 rounded-lg px-3 py-2",
                  "text-sm font-medium transition-colors",
                  pathname?.startsWith("/admin")
                    ? "bg-blue-100 text-blue-700"
                    : "text-blue-600 hover:bg-blue-50"
                )}
              >
                <Shield className="size-5" />
                Admin
              </Link>
            )}
            <Link
              href="/settings"
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2",
                "text-sm font-medium transition-colors",
                pathname === "/settings"
                  ? "bg-primary-subtle text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Settings className="size-5" />
              Configurações
            </Link>
            <button
              onClick={() => {
                logout();
                onClose?.();
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2",
                "text-sm font-medium text-destructive",
                "transition-colors hover:bg-destructive-subtle"
              )}
            >
              <LogOut className="size-5" />
              Sair
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
