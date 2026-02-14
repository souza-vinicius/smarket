"use client";

import { useState } from "react";

import Link from "next/link";

import { type ColumnDef } from "@tanstack/react-table";
import { Search, CreditCard, Calendar } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { useAdminSubscriptionsList } from "@/hooks/use-admin-subscriptions";
import type { AdminSubscription } from "@/types/admin";


const columns: ColumnDef<AdminSubscription>[] = [
  {
    accessorKey: "user_email",
    header: "Usuário",
    cell: ({ row }) => (
      <div>
        <div className="font-medium text-gray-900">{row.original.user_email}</div>
        <div className="text-sm text-gray-500">ID: {row.original.id.slice(0, 8)}</div>
      </div>
    ),
  },
  {
    accessorKey: "plan",
    header: "Plano",
    cell: ({ row }) => {
      const {plan} = row.original;
      const planColors: Record<string, string> = {
        free: "bg-gray-100 text-gray-800",
        basic: "bg-blue-100 text-blue-800",
        premium: "bg-purple-100 text-purple-800",
      };
      return (
        <Badge className={planColors[plan] || planColors.free}>
          {plan.toUpperCase()}
        </Badge>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const {status} = row.original;
      const statusColors: Record<string, string> = {
        trial: "bg-yellow-100 text-yellow-800",
        active: "bg-green-100 text-green-800",
        past_due: "bg-orange-100 text-orange-800",
        cancelled: "bg-red-100 text-red-800",
        expired: "bg-gray-100 text-gray-800",
      };
      return (
        <Badge className={statusColors[status] || statusColors.expired}>
          {status.toUpperCase()}
        </Badge>
      );
    },
  },
  {
    accessorKey: "billing_cycle",
    header: "Ciclo",
    cell: ({ row }) => {
      const cycle = row.original.billing_cycle;
      return (
        <span className="capitalize text-gray-600">
          {cycle === "monthly" ? "Mensal" : cycle === "yearly" ? "Anual" : "-"}
        </span>
      );
    },
  },
  {
    accessorKey: "current_period_end",
    header: "Renovação",
    cell: ({ row }) => (
      <span className="text-gray-600">
        {row.original.current_period_end
          ? new Date(row.original.current_period_end).toLocaleDateString("pt-BR")
          : row.original.trial_end
          ? new Date(row.original.trial_end).toLocaleDateString("pt-BR")
          : "-"}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Link href={`/admin/subscriptions/${row.original.id}`}>
        <Button variant="outline" size="sm">
          Detalhes
        </Button>
      </Link>
    ),
  },
];

export default function SubscriptionsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const { subscriptions, total, pages, isLoading } = useAdminSubscriptionsList({
    page,
    perPage: 20,
    search: search || undefined,
    status: statusFilter || undefined,
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
            <CreditCard className="size-8" />
            Assinaturas
          </h1>
          <p className="mt-2 text-gray-600">
            Gerencie as assinaturas da plataforma
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-lg bg-white p-4 shadow">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative min-w-[300px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar por email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os status</option>
            <option value="trial">Trial</option>
            <option value="active">Ativo</option>
            <option value="past_due">Atrasado</option>
            <option value="cancelled">Cancelado</option>
            <option value="expired">Expirado</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-gray-500">Total</div>
          <div className="text-2xl font-bold text-gray-900">{total}</div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg bg-white shadow">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={subscriptions}
              searchKey="user_email"
              searchPlaceholder="Filtrar na tabela..."
            />

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 p-4">
                <div className="text-sm text-gray-500">
                  Página {page} de {pages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setPage((p) => Math.max(1, p - 1)); }}
                    disabled={page === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setPage((p) => Math.min(pages, p + 1)); }}
                    disabled={page === pages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
