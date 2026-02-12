"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isNative } from "@/lib/capacitor";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";

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
      <div className="flex items-center justify-center min-h-screen">
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
          <p className="text-sm text-gray-500 mt-1">Mercado Esperto</p>
        </div>

        <nav className="mt-6">
          <Link
            href="/admin"
            className="block px-6 py-3 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            📊 Dashboard
          </Link>
          <Link
            href="/admin/users"
            className="block px-6 py-3 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            👥 Usuários
          </Link>
          <Link
            href="/admin/subscriptions"
            className="block px-6 py-3 text-gray-700 hover:bg-gray-100 transition-colors opacity-50 cursor-not-allowed"
          >
            💳 Assinaturas (Em breve)
          </Link>
          <Link
            href="/admin/payments"
            className="block px-6 py-3 text-gray-700 hover:bg-gray-100 transition-colors opacity-50 cursor-not-allowed"
          >
            💰 Pagamentos (Em breve)
          </Link>

          <div className="mt-8 border-t border-gray-200 pt-4">
            <Link
              href="/dashboard"
              className="block px-6 py-3 text-blue-600 hover:bg-blue-50 transition-colors"
            >
              ← Voltar ao App
            </Link>
          </div>
        </nav>

        {/* User info */}
        <div className="absolute bottom-0 w-64 p-6 border-t border-gray-200 bg-white">
          <div className="text-xs text-gray-500">Logado como:</div>
          <div className="text-sm font-medium text-gray-900 truncate">
            {user?.email}
          </div>
          <div className="text-xs text-blue-600 mt-1 font-medium uppercase">
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
