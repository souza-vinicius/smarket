'use client';

import { useEffect, useState } from 'react';

import { Save, User, Home, Users, Check } from 'lucide-react';

import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfile, useUpdateProfile } from '@/hooks/use-settings';

export default function SettingsPage() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const [householdIncome, setHouseholdIncome] = useState('');
  const [adultsCount, setAdultsCount] = useState('');
  const [childrenCount, setChildrenCount] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setHouseholdIncome(profile.household_income?.toString() || '');
      setAdultsCount(profile.adults_count?.toString() || '');
      setChildrenCount(profile.children_count?.toString() || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await updateProfile.mutateAsync({
      household_income: householdIncome ? parseFloat(householdIncome) : undefined,
      adults_count: adultsCount ? parseInt(adultsCount) : undefined,
      children_count: childrenCount ? parseInt(childrenCount) : undefined,
    });

    setShowSuccess(true);
    setTimeout(() => { setShowSuccess(false); }, 3000);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      
      <div className="flex-1 pl-64">
        <Header 
          title="Configurações" 
          subtitle="Gerencie seu perfil e preferências"
        />
        
        <main className="p-6">
          <div className="max-w-2xl">
            {/* Profile Card */}
            <Card className="border-slate-200 bg-white">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100">
                    <User className="size-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Meu Perfil</CardTitle>
                    <CardDescription>
                      Informações para personalizar seus insights de compras
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {isLoading ? (
                  <div className="space-y-6">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : (
                  <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-6">
                    {/* Household Income */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Home className="size-4 text-slate-500" />
                        <label htmlFor="household-income" className="text-sm font-medium text-slate-900">
                          Renda Mensal da Casa (R$)
                        </label>
                      </div>
                      <Input
                        id="household-income"
                        type="number"
                        step="0.01"
                        min="0"
                        value={householdIncome}
                        onChange={(e) => { setHouseholdIncome(e.target.value); }}
                        placeholder="0,00"
                        className="max-w-xs"
                      />
                      <p className="text-xs text-slate-500">
                        Soma da renda das pessoas que arcam com as despesas da casa
                      </p>
                    </div>

                    {/* Adults Count */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="size-4 text-slate-500" />
                        <label htmlFor="adults-count" className="text-sm font-medium text-slate-900">
                          Quantidade de Adultos
                        </label>
                      </div>
                      <Input
                        id="adults-count"
                        type="number"
                        min="0"
                        max="20"
                        value={adultsCount}
                        onChange={(e) => { setAdultsCount(e.target.value); }}
                        placeholder="1"
                        className="max-w-[120px]"
                      />
                      <p className="text-xs text-slate-500">
                        Número de adultos que moram na casa
                      </p>
                    </div>

                    {/* Children Count */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="size-4 text-slate-500" />
                        <label htmlFor="children-count" className="text-sm font-medium text-slate-900">
                          Quantidade de Crianças
                        </label>
                      </div>
                      <Input
                        id="children-count"
                        type="number"
                        min="0"
                        max="20"
                        value={childrenCount}
                        onChange={(e) => { setChildrenCount(e.target.value); }}
                        placeholder="0"
                        className="max-w-[120px]"
                      />
                      <p className="text-xs text-slate-500">
                        Número de crianças que moram na casa
                      </p>
                    </div>

                    {/* Submit Button */}
                    <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
                      <Button
                        type="submit"
                        disabled={updateProfile.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {updateProfile.isPending ? (
                          <>
                            <span className="mr-2 animate-spin">⏳</span>
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 size-4" />
                            Salvar Alterações
                          </>
                        )}
                      </Button>

                      {showSuccess && (
                        <div className="flex items-center gap-2 text-sm text-emerald-600">
                          <Check className="size-4" />
                          Alterações salvas com sucesso!
                        </div>
                      )}
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="mt-6 border-slate-200 bg-gradient-to-br from-emerald-50 to-teal-50">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                    <span className="text-lg">💡</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">
                      Por que essas informações são importantes?
                    </h4>
                    <p className="mt-1 text-sm text-slate-600">
                      Usamos esses dados para gerar insights personalizados sobre seus gastos.
                      Por exemplo, podemos comparar sua proporção de gastos com alimentos em
                      relação à sua renda, ou sugerir quantidades ideais de compras baseadas
                      no tamanho da sua família.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
