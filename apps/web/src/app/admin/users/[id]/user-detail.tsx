"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  useAdminUserDetail,
  useAdminUserActivity,
  useUpdateAdminUser,
  useDeleteAdminUser,
  useRestoreAdminUser,
  useImpersonateUser,
} from "@/hooks/use-admin-users";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  FileText,
  Shield,
  Eye,
  Trash2,
  RotateCcw,
  Edit,
} from "lucide-react";

const adminRoleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  support: "Suporte",
  finance: "Financeiro",
  read_only: "Somente Leitura",
};

export default function UserDetailClient() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const { user, isLoading } = useAdminUserDetail(userId);
  const { logs, isLoading: isLoadingActivity } = useAdminUserActivity(userId);
  const updateMutation = useUpdateAdminUser(userId);
  const deleteMutation = useDeleteAdminUser(userId);
  const restoreMutation = useRestoreAdminUser(userId);
  const impersonateMutation = useImpersonateUser(userId);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImpersonateModal, setShowImpersonateModal] = useState(false);

  const [editForm, setEditForm] = useState({
    full_name: "",
    is_active: true,
    admin_role: "",
  });

  const handleDelete = () => {
    deleteMutation.deleteUser();
    setShowDeleteModal(false);
    toast.success("Usuário desativado com sucesso");
    router.push("/admin/users");
  };

  const handleRestore = () => {
    restoreMutation.restoreUser();
    setShowRestoreModal(false);
    toast.success("Usuário reativado com sucesso");
  };

  const handleUpdate = () => {
    const data: { full_name?: string; is_active?: boolean; admin_role?: string | null } = {};
    if (editForm.full_name) data.full_name = editForm.full_name;
    data.is_active = editForm.is_active;
    data.admin_role = editForm.admin_role || null;

    updateMutation.updateUser(data);
    setShowEditModal(false);
    toast.success("Usuário atualizado com sucesso");
  };

  const handleImpersonate = () => {
    impersonateMutation.impersonate();
    setShowImpersonateModal(false);
  };

  // Save impersonation token and redirect
  if (impersonateMutation.isSuccess && impersonateMutation.data) {
    localStorage.setItem("impersonationToken", impersonateMutation.data.access_token);
    localStorage.setItem("impersonatedUser", JSON.stringify(impersonateMutation.data.user));
    router.push("/dashboard");
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Usuário não encontrado.</p>
        <Link href="/admin/users" className="text-blue-600 hover:underline mt-4 inline-block">
          Voltar para lista
        </Link>
      </div>
    );
  }

  const isDeleted = user.deleted_at !== null;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/users"
          className="text-gray-600 hover:text-gray-900 flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para usuários
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <User className="h-8 w-8" />
              {user.full_name}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-gray-600 flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {user.email}
              </span>
              {user.admin_role && (
                <Badge className="bg-purple-100 text-purple-800">
                  <Shield className="h-3 w-3 mr-1" />
                  {adminRoleLabels[user.admin_role] || user.admin_role}
                </Badge>
              )}
              {isDeleted ? (
                <Badge variant="destructive">Desativado</Badge>
              ) : user.is_active ? (
                <Badge className="bg-green-100 text-green-800">Ativo</Badge>
              ) : (
                <Badge variant="secondary">Inativo</Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {!isDeleted && (
              <Button
                variant="outline"
                onClick={() => setShowImpersonateModal(true)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Impersonar
              </Button>
            )}

            {!isDeleted ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditForm({
                      full_name: user.full_name,
                      is_active: user.is_active,
                      admin_role: user.admin_role || "",
                    });
                    setShowEditModal(true);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteModal(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Desativar
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowRestoreModal(true)}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reativar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Informações do Perfil
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Renda Familiar</div>
                <div className="font-medium">
                  {user.household_income
                    ? `R$ ${user.household_income.toLocaleString("pt-BR")}`
                    : "Não informado"}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Adultos na Casa</div>
                <div className="font-medium">{user.adults_count || "Não informado"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Crianças na Casa</div>
                <div className="font-medium">{user.children_count || "Não informado"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Data de Cadastro</div>
                <div className="font-medium">
                  {new Date(user.created_at).toLocaleDateString("pt-BR")}
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Card */}
          {user.subscription && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Assinatura
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Plano</div>
                  <Badge
                    className={
                      user.subscription.plan === "premium"
                        ? "bg-purple-100 text-purple-800"
                        : user.subscription.plan === "basic"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    }
                  >
                    {user.subscription.plan.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Status</div>
                  <div className="font-medium capitalize">
                    {user.subscription.status}
                  </div>
                </div>
                {user.subscription.trial_end && (
                  <div>
                    <div className="text-sm text-gray-500">Fim do Trial</div>
                    <div className="font-medium">
                      {new Date(user.subscription.trial_end).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Activity Log */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Histórico de Atividades
            </h2>
            {isLoadingActivity ? (
              <div className="text-gray-500">Carregando...</div>
            ) : logs.length === 0 ? (
              <div className="text-gray-500">Nenhuma atividade registrada.</div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {log.action}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          por {log.admin_email}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Estatísticas
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <FileText className="h-4 w-4" />
                  Notas Fiscais
                </div>
                <span className="font-bold text-lg">{user.invoices_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-gray-600">Total Gasto</div>
                <span className="font-bold text-lg">
                  R$ {user.total_spent.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Desativar Usuário"
      >
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Tem certeza que deseja desativar o usuário <strong>{user.full_name}</strong>?
            Esta ação pode ser desfeita posteriormente.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Desativar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Restore Modal */}
      <Modal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        title="Reativar Usuário"
      >
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Tem certeza que deseja reativar o usuário <strong>{user.full_name}</strong>?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowRestoreModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRestore}>Reativar</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Editar Usuário"
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome Completo
            </label>
            <input
              type="text"
              value={editForm.full_name}
              onChange={(e) =>
                setEditForm({ ...editForm, full_name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={editForm.is_active}
              onChange={(e) =>
                setEditForm({ ...editForm, is_active: e.target.checked })
              }
              className="rounded border-gray-300"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">
              Usuário ativo
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Função Administrativa
            </label>
            <select
              value={editForm.admin_role}
              onChange={(e) =>
                setEditForm({ ...editForm, admin_role: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Nenhuma (usuário comum)</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Administrador</option>
              <option value="support">Suporte</option>
              <option value="finance">Financeiro</option>
              <option value="read_only">Somente Leitura</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate}>Salvar</Button>
          </div>
        </div>
      </Modal>

      {/* Impersonate Modal */}
      <Modal
        isOpen={showImpersonateModal}
        onClose={() => setShowImpersonateModal(false)}
        title="Impersonar Usuário"
      >
        <div className="p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 text-sm">
              Você está prestes a acessar a conta de <strong>{user.full_name}</strong>.
              Todas as ações serão registradas no log de auditoria.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowImpersonateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImpersonate}>
              <Eye className="h-4 w-4 mr-2" />
              Continuar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
