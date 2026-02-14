"use client";

import { useEffect } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { isNative } from "@/lib/capacitor";

/**
 * Admin layout with multi-layer access control:
 * - Layer 1: Native platform check (redirect if WebView)
 * - Layer 2: Admin role check (redirect if not admin)
 * - Layer 3: Sidebar navigation
 */

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Layer 1: Block native platform access (WEB ONLY)
    if (isNative()) {
      toast.error("Área administrativa disponível apenas no navegador.");
      router.replace("/dashboard");
      return;
    }

    // Layer 2: Check admin role (after user loads)
    if (!isLoading && user && !user.is_admin) {
      toast.error("Acesso negado. Apenas administradores podem acessar esta área.");
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  // Show loading while checking access
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600">Verificando permissões...</div>
      </div>
    );
  }

  // Block rendering if native or not admin
  if (isNative() || !user?.is_admin) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
          <p className="mt-1 text-sm text-gray-500">Mercado Esperto</p>
        </div>

        <nav className="mt-6">
          <Link
            href="/admin"
            className="block px-6 py-3 text-gray-700 transition-colors hover:bg-gray-100"
          >
            📊 Dashboard
          </Link>
          <Link
            href="/admin/users"
            className="block px-6 py-3 text-gray-700 transition-colors hover:bg-gray-100"
          >
            👥 Usuários
          </Link>
          <Link
            href="/admin/subscriptions"
            className="block px-6 py-3 text-gray-700 transition-colors hover:bg-gray-100"
          >
            💳 Assinaturas
          </Link>
          <Link
            href="/admin/payments"
            className="block px-6 py-3 text-gray-700 transition-colors hover:bg-gray-100"
          >
            💰 Pagamentos
          </Link>
          <Link
            href="/admin/coupons"
            className="block px-6 py-3 text-gray-700 transition-colors hover:bg-gray-100"
          >
            🎟️ Cupons
          </Link>
          <Link
            href="/admin/reports"
            className="block px-6 py-3 text-gray-700 transition-colors hover:bg-gray-100"
          >
            📈 Relatórios
          </Link>
          <Link
            href="/admin/settings"
            className="block px-6 py-3 text-gray-700 transition-colors hover:bg-gray-100"
          >
            ⚙️ Configurações
          </Link>

          <div className="mt-8 border-t border-gray-200 pt-4">
            <Link
              href="/dashboard"
              className="block px-6 py-3 text-blue-600 transition-colors hover:bg-blue-50"
            >
              ← Voltar ao App
            </Link>
          </div>
        </nav>

        {/* User info */}
        <div className="absolute bottom-0 w-64 border-t border-gray-200 bg-white p-6">
          <div className="text-xs text-gray-500">Logado como:</div>
          <div className="truncate text-sm font-medium text-gray-900">
            {user?.email}
          </div>
          <div className="mt-1 text-xs font-medium uppercase text-blue-600">
            {user?.admin_role}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
