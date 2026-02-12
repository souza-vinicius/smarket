"use client";

import { useCallback, useEffect, useState } from "react";
import adminApi from "@/lib/admin-api";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  admin_role: string | null;
  deleted_at: string | null;
  created_at: string;
  invoices_count: number;
}

interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

const ADMIN_ROLES = [
  { value: "", label: "Nenhum (usuário comum)" },
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "support", label: "Suporte" },
  { value: "finance", label: "Financeiro" },
  { value: "read_only", label: "Somente Leitura" },
];

export default function AdminUsersPage() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page, per_page: 20 };
      if (search) params.search = search;
      const response = await adminApi.get("/users", { params });
      setData(response.data);
    } catch (error: any) {
      console.error("Failed to fetch users:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const openRoleEditor = (user: AdminUser) => {
    setEditingUser(user);
    setEditRole(user.admin_role || "");
  };

  const saveRole = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const payload: Record<string, string | null> = {
        admin_role: editRole || null,
      };
      await adminApi.patch(`/users/${editingUser.id}`, payload);
      toast.success(`Função de ${editingUser.full_name} atualizada`);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      toast.error(detail || "Erro ao atualizar usuário");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user: AdminUser) => {
    try {
      await adminApi.patch(`/users/${user.id}`, {
        is_active: !user.is_active,
      });
      toast.success(
        `${user.full_name} ${user.is_active ? "desativado" : "ativado"}`
      );
      fetchUsers();
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      toast.error(detail || "Erro ao atualizar usuário");
    }
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("T")[0].split("-");
    return `${day}/${month}/${year}`;
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Gerenciamento de Usuários
        </h1>
        <p className="text-gray-600 mt-2">
          {data ? `${data.total} usuário(s) cadastrado(s)` : "Carregando..."}
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Buscar
        </button>
      </form>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Usuário
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Função Admin
              </th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Notas Fiscais
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Criado em
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading && !data ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Carregando...
                </td>
              </tr>
            ) : data?.users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Nenhum usuário encontrado
                </td>
              </tr>
            ) : (
              data?.users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">
                      {user.full_name}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {user.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.admin_role ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 uppercase">
                        {user.admin_role}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-700">
                    {user.invoices_count}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openRoleEditor(user)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Editar Role
                      </button>
                      <button
                        onClick={() => toggleActive(user)}
                        className={`text-sm font-medium ${
                          user.is_active
                            ? "text-red-600 hover:text-red-800"
                            : "text-green-600 hover:text-green-800"
                        }`}
                      >
                        {user.is_active ? "Desativar" : "Ativar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Página {data.page} de {data.pages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
              disabled={page >= data.pages}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {/* Role Editor Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Editar Função Admin
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Usuário: <strong>{editingUser.full_name}</strong> (
              {editingUser.email})
            </p>

            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ADMIN_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={saveRole}
                disabled={saving}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
