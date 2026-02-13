"use client";

import { useState } from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAdminUsersList } from "@/hooks/use-admin-users";
import type { AdminUser } from "@/types/admin";
import { Search, Plus, Users } from "lucide-react";

const columns: ColumnDef<AdminUser>[] = [
  {
    accessorKey: "full_name",
    header: "Nome",
    cell: ({ row }) => (
      <div>
        <div className="font-medium text-gray-900">{row.original.full_name}</div>
        <div className="text-sm text-gray-500">{row.original.email}</div>
      </div>
    ),
  },
  {
    accessorKey: "subscription_plan",
    header: "Plano",
    cell: ({ row }) => {
      const plan = row.original.subscription_plan || "free";
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
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.original.is_active;
      const isDeleted = row.original.deleted_at !== null;

      if (isDeleted) {
        return <Badge variant="destructive">Desativado</Badge>;
      }
      return isActive ? (
        <Badge className="bg-green-100 text-green-800">Ativo</Badge>
      ) : (
        <Badge variant="secondary">Inativo</Badge>
      );
    },
  },
  {
    accessorKey: "invoices_count",
    header: "Notas",
    cell: ({ row }) => (
      <span className="text-gray-600">{row.original.invoices_count}</span>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Criado em",
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
      <Link href={`/admin/users/${row.original.id}`}>
        <Button variant="outline" size="sm">
          Detalhes
        </Button>
      </Link>
    ),
  },
];

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const { users, total, pages, isLoading } = useAdminUsersList({
    page,
    perPage: 20,
    search: search || undefined,
    includeDeleted,
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="h-8 w-8" />
            Usuários
          </h1>
          <p className="text-gray-600 mt-2">
            Gerencie os usuários da plataforma
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
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => {
                setIncludeDeleted(e.target.checked);
                setPage(1);
              }}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-600">Incluir desativados</span>
          </label>
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
              data={users}
              searchKey="full_name"
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
