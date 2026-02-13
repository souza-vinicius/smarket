"use client";

import { useState } from "react";

import Link from "next/link";

import { type ColumnDef } from "@tanstack/react-table";
import { Search, Plus, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { useAdminUsersList } from "@/hooks/use-admin-users";
import type { AdminUser } from "@/types/admin";


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
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
            <Users className="size-8" />
            Usuários
          </h1>
          <p className="mt-2 text-gray-600">
            Gerencie os usuários da plataforma
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
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2">
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
              data={users}
              searchKey="full_name"
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
