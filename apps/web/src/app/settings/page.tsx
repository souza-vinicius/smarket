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
} from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, ConfirmModal } from "@/components/ui/modal";
import { useAuth } from "@/hooks/use-auth";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isHouseholdModalOpen, setIsHouseholdModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

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

      {/* Security Section */}
      <SettingsSection title="Segurança">
        <SettingsItem
          icon={<Shield className="w-5 h-5" />}
          label="Alterar senha"
          onClick={() => {}}
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
