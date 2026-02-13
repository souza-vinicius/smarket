"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Users,
  DollarSign,
  LogOut,
  ChevronRight,
  Moon,
  Bell,
  Shield,
  HelpCircle,
  Crown,
  Calendar,
} from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, ConfirmModal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { useAuth, useChangePassword } from "@/hooks/use-auth";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useSubscription } from "@/hooks/use-subscription";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-foreground mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SettingsItem({
  icon,
  label,
  value,
  onClick,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onClick?: () => void;
  action?: React.ReactNode;
}) {
  return (
    <Card
      isInteractive={!!onClick}
      onClick={onClick}
      className="flex items-center gap-4"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground">{label}</p>
        {value && (
          <p className="text-sm text-muted-foreground truncate">{value}</p>
        )}
      </div>
      {action || (onClick && <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />)}
    </Card>
  );
}

function ProfileModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { data: settings, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  const [formData, setFormData] = useState({
    full_name: settings?.full_name || "",
    email: settings?.email || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData, {
      onSuccess: onClose,
    });
  };

  if (isLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Editar Perfil">
        <div className="space-y-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Perfil"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={updateMutation.isPending}
          >
            Salvar
          </Button>
        </>
      }
    >
      <form className="space-y-4">
        <Input
          label="Nome completo"
          value={formData.full_name}
          onChange={(e) =>
            setFormData({ ...formData, full_name: e.target.value })
          }
        />
        <Input
          label="E-mail"
          type="email"
          value={formData.email}
          disabled
          hint="O e-mail não pode ser alterado"
        />
      </form>
    </Modal>
  );
}

function ChangePasswordModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const changePasswordMutation = useChangePassword();
  const [formData, setFormData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [errors, setErrors] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const validateForm = () => {
    const newErrors = {
      current_password: "",
      new_password: "",
      confirm_password: "",
    };

    if (!formData.current_password) {
      newErrors.current_password = "Senha atual é obrigatória";
    }

    if (!formData.new_password) {
      newErrors.new_password = "Nova senha é obrigatória";
    } else if (formData.new_password.length < 8) {
      newErrors.new_password = "A senha deve ter no mínimo 8 caracteres";
    }

    if (!formData.confirm_password) {
      newErrors.confirm_password = "Confirme a nova senha";
    } else if (formData.new_password !== formData.confirm_password) {
      newErrors.confirm_password = "As senhas não coincidem";
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== "");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    changePasswordMutation.mutate(
      {
        current_password: formData.current_password,
        new_password: formData.new_password,
      },
      {
        onSuccess: () => {
          toast.success("Senha alterada com sucesso!");
          setFormData({
            current_password: "",
            new_password: "",
            confirm_password: "",
          });
          setErrors({
            current_password: "",
            new_password: "",
            confirm_password: "",
          });
          onClose();
        },
        onError: (error: any) => {
          const message = error?.response?.data?.detail || "Erro ao alterar senha";
          toast.error(message);
        },
      }
    );
  };

  const handleClose = () => {
    if (!changePasswordMutation.isPending) {
      setFormData({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      setErrors({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Alterar Senha"
      footer={
        <>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={changePasswordMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={changePasswordMutation.isPending}
          >
            Alterar Senha
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="Senha atual"
          type="password"
          value={formData.current_password}
          onChange={(e) => {
            setFormData({ ...formData, current_password: e.target.value });
            setErrors({ ...errors, current_password: "" });
          }}
          error={errors.current_password}
          disabled={changePasswordMutation.isPending}
        />
        <Input
          label="Nova senha"
          type="password"
          value={formData.new_password}
          onChange={(e) => {
            setFormData({ ...formData, new_password: e.target.value });
            setErrors({ ...errors, new_password: "" });
          }}
          error={errors.new_password}
          hint="Mínimo de 8 caracteres"
          disabled={changePasswordMutation.isPending}
        />
        <Input
          label="Confirmar nova senha"
          type="password"
          value={formData.confirm_password}
          onChange={(e) => {
            setFormData({ ...formData, confirm_password: e.target.value });
            setErrors({ ...errors, confirm_password: "" });
          }}
          error={errors.confirm_password}
          disabled={changePasswordMutation.isPending}
        />
      </form>
    </Modal>
  );
}

function HouseholdModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { data: settings, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  const [formData, setFormData] = useState({
    household_income: settings?.household_income || 0,
    adults_count: settings?.adults_count || 1,
    children_count: settings?.children_count || 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData, {
      onSuccess: onClose,
    });
  };

  if (isLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Perfil Familiar">
        <div className="space-y-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Perfil Familiar"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={updateMutation.isPending}
          >
            Salvar
          </Button>
        </>
      }
    >
      <form className="space-y-4">
        <Input
          label="Renda familiar mensal"
          type="number"
          value={formData.household_income}
          onChange={(e) =>
            setFormData({
              ...formData,
              household_income: Number(e.target.value),
            })
          }
          leftIcon={<span className="text-muted-foreground">R$</span>}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Adultos"
            type="number"
            min={1}
            value={formData.adults_count}
            onChange={(e) =>
              setFormData({
                ...formData,
                adults_count: Number(e.target.value),
              })
            }
          />
          <Input
            label="Crianças"
            type="number"
            min={0}
            value={formData.children_count}
            onChange={(e) =>
              setFormData({
                ...formData,
                children_count: Number(e.target.value),
              })
            }
          />
        </div>
      </form>
    </Modal>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const { data: settings, isLoading } = useSettings();
  const { data: subscriptionData, isLoading: isSubscriptionLoading } = useSubscription();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isHouseholdModalOpen, setIsHouseholdModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const subscription = subscriptionData?.subscription;
  const usage = subscriptionData?.usage;

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <PageLayout title="Configurações" subtitle="Gerencie suas preferências">
      {/* Profile Card */}
      <Card className="mb-6 flex items-center gap-4">
        <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xl font-bold">
          {user?.full_name?.charAt(0).toUpperCase() || "U"}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-foreground">
            {user?.full_name || "Usuário"}
          </h2>
          <p className="text-muted-foreground truncate">{user?.email}</p>
        </div>
      </Card>

      {/* Profile Section */}
      <SettingsSection title="Perfil">
        <SettingsItem
          icon={<User className="w-5 h-5" />}
          label="Editar perfil"
          value={settings?.full_name}
          onClick={() => setIsProfileModalOpen(true)}
        />
        <SettingsItem
          icon={<Users className="w-5 h-5" />}
          label="Perfil familiar"
          value={
            settings?.adults_count
              ? `${settings.adults_count} adultos, ${settings.children_count} crianças`
              : undefined
          }
          onClick={() => setIsHouseholdModalOpen(true)}
        />
        <SettingsItem
          icon={<DollarSign className="w-5 h-5" />}
          label="Renda mensal"
          value={
            settings?.household_income
              ? `R$ ${settings.household_income.toLocaleString("pt-BR")}`
              : undefined
          }
          onClick={() => setIsHouseholdModalOpen(true)}
        />
      </SettingsSection>

      {/* Preferences Section */}
      <SettingsSection title="Preferências">
        <SettingsItem
          icon={<Bell className="w-5 h-5" />}
          label="Notificações"
          value="Ativadas"
        />
        <SettingsItem
          icon={<Moon className="w-5 h-5" />}
          label="Tema"
          value="Automático"
        />
      </SettingsSection>

      {/* Subscription Section */}
      <SettingsSection title="Assinatura">
        {isSubscriptionLoading ? (
          <Skeleton className="h-32" />
        ) : subscription ? (
          <Card className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-foreground">
                      Plano {subscription.plan === "free" ? "Gratuito" : subscription.plan === "basic" ? "Básico" : "Premium"}
                    </h3>
                    <Badge variant={subscription.status === "trial" ? "warning" : subscription.status === "active" ? "success" : "default"}>
                      {subscription.status === "trial" ? "Trial" : subscription.status === "active" ? "Ativo" : subscription.status}
                    </Badge>
                    {subscription.status === "trial" && (
                      <Badge variant="success" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        ✨ 30 Dias Ilimitados
                      </Badge>
                    )}
                  </div>
                  {subscription.status === "trial" && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Trial até {new Date(subscription.trial_end).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                  {subscription.billing_cycle && (
                    <p className="text-sm text-muted-foreground">
                      Cobrança {subscription.billing_cycle === "monthly" ? "mensal" : "anual"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Usage Stats */}
            {usage && (
              <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notas Fiscais</p>
                  <p className="text-sm font-semibold text-foreground">
                    {usage.invoices_used} / {usage.invoices_limit === null ? "∞" : usage.invoices_limit}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Análises de IA</p>
                  <p className="text-sm font-semibold text-foreground">
                    {usage.ai_analyses_used} / {usage.ai_analyses_limit === null ? "∞" : usage.ai_analyses_limit}
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <Button
              fullWidth
              variant="outline"
              onClick={() => router.push("/settings/subscription")}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Gerenciar Assinatura
            </Button>
          </Card>
        ) : (
          <Card className="p-4 text-center">
            <p className="text-muted-foreground mb-3">
              Nenhuma assinatura encontrada
            </p>
            <Button onClick={() => router.push("/pricing")}>
              Ver Planos
            </Button>
          </Card>
        )}
      </SettingsSection>

      {/* Security Section */}
      <SettingsSection title="Segurança">
        <SettingsItem
          icon={<Shield className="w-5 h-5" />}
          label="Alterar senha"
          onClick={() => setIsChangePasswordModalOpen(true)}
        />
      </SettingsSection>

      {/* Support Section */}
      <SettingsSection title="Suporte">
        <SettingsItem
          icon={<HelpCircle className="w-5 h-5" />}
          label="Ajuda e suporte"
          onClick={() => {}}
        />
      </SettingsSection>

      {/* Logout */}
      <div className="mt-8">
        <Button
          variant="danger"
          fullWidth
          leftIcon={<LogOut className="w-5 h-5" />}
          onClick={() => setIsLogoutModalOpen(true)}
        >
          Sair da conta
        </Button>
      </div>

      {/* Modals */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
      <HouseholdModal
        isOpen={isHouseholdModalOpen}
        onClose={() => setIsHouseholdModalOpen(false)}
      />
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />
      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        variant="danger"
        title="Sair da conta"
        message="Tem certeza que deseja sair?"
        confirmLabel="Sair"
        cancelLabel="Cancelar"
      />
    </PageLayout>
  );
}
