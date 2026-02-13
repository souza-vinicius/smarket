"use client";

import { useState } from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAdminPaymentsList } from "@/hooks/use-admin-payments";
import type { AdminPayment } from "@/types/admin";
import { Search, DollarSign, Calendar } from "lucide-react";

const columns: ColumnDef<AdminPayment>[] = [
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
    accessorKey: "amount",
    header: "Valor",
    cell: ({ row }) => (
      <div className="font-medium text-gray-900">
        {new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: row.original.currency || "BRL",
        }).format(row.original.amount)}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      const statusColors: Record<string, string> = {
        succeeded: "bg-green-100 text-green-800",
        pending: "bg-yellow-100 text-yellow-800",
        failed: "bg-red-100 text-red-800",
        refunded: "bg-gray-100 text-gray-800",
        partially_refunded: "bg-blue-100 text-blue-800",
      };
      const statusLabels: Record<string, string> = {
        succeeded: "PAGO",
        pending: "PENDENTE",
        failed: "FALHOU",
        refunded: "REEMBOLSADO",
        partially_refunded: "PARCIAL",
      };
      return (
        <Badge className={statusColors[status] || statusColors.succeeded}>
          {statusLabels[status] || status.toUpperCase()}
        </Badge>
      );
    },
  },
  {
    accessorKey: "provider",
    header: "Provider",
    cell: ({ row }) => (
      <span className="text-gray-600 capitalize">{row.original.provider}</span>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Data",
    cell: ({ row }) => (
      <span className="text-gray-600">
        {new Date(row.original.created_at).toLocaleDateString("pt-BR")}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Link href={`/admin/payments/${row.original.id}`}>
        <Button variant="outline" size="sm">
          Detalhes
        </Button>
      </Link>
    ),
  },
];

export default function PaymentsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const { payments, total, pages, isLoading } = useAdminPaymentsList({
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
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <DollarSign className="h-8 w-8" />
            Pagamentos
          </h1>
          <p className="text-gray-600 mt-2">
            Gerencie os pagamentos e reembolsos
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os status</option>
            <option value="succeeded">Pago</option>
            <option value="pending">Pendente</option>
            <option value="failed">Falhou</option>
            <option value="refunded">Reembolsado</option>
            <option value="partially_refunded">Parcial</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total</div>
          <div className="text-2xl font-bold text-gray-900">{total}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={payments}
              searchKey="user_email"
              searchPlaceholder="Filtrar na tabela..."
            />

            {/* Pagination */}
            {pages > 1 && (
              <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Página {page} de {pages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(pages, p + 1))}
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
