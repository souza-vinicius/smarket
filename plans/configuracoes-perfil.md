# Planejamento: Area de Configuracoes - Meu Perfil

## Objetivo

Criar a area de configuracoes (`/settings`) com a secao "Meu Perfil" para coletar informacoes relevantes para o modelo de IA traçar melhor o perfil de compra do usuario.

## Campos Necessarios

| Campo | Tipo | Descricao |
|--------|-------|-----------|
| `household_income` | Decimal | Soma da renda das pessoas que arcam com as despesas da casa |
| `adults_count` | Integer | Quantos adultos moram na casa |
| `children_count` | Integer | Quantas criancas moram na casa |

---

## Backend - Alteracoes Necessarias

### 1. Modelo User (`apps/api/src/models/user.py`)

Adicionar campos ao modelo:

```python
from sqlalchemy import Numeric, Integer

class User(Base):
    # ... campos existentes ...

    # Informacoes do perfil para IA
    household_income: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=Decimal("0.00"),
        nullable=True
    )
    adults_count: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=True
    )
    children_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=True
    )
```

### 2. Schema User (`apps/api/src/schemas/user.py`)

Adicionar schemas para atualizacao do perfil:

```python
from decimal import Decimal

class UserProfileUpdate(BaseModel):
    household_income: Optional[Decimal] = Field(None, ge=0)
    adults_count: Optional[int] = Field(None, ge=0, le=20)
    children_count: Optional[int] = Field(None, ge=0, le=20)

class UserProfileResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    household_income: Optional[Decimal]
    adults_count: Optional[int]
    children_count: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
```

### 3. Router User (`apps/api/src/routers/users.py`)

Criar novo router para gerenciamento de perfil:

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.dependencies import get_current_user
from src.models.user import User
from src.schemas.user import UserProfileUpdate, UserProfileResponse

router = APIRouter()

@router.get("/profile", response_model=UserProfileResponse)
async def get_profile(
    current_user: User = Depends(get_current_user)
):
    """Get current user profile."""
    return current_user

@router.patch("/profile", response_model=UserProfileResponse)
async def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user profile."""
    update_data = profile_data.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    await db.commit()
    await db.refresh(current_user)
    
    return current_user
```

### 4. Main App (`apps/api/src/main.py`)

Registrar o novo router:

```python
from src.routers import users

app.include_router(users.router, prefix="/users", tags=["users"])
```

### 5. Migration (`alembic`)

Criar migration para adicionar os campos:

```bash
alembic revision --autogenerate -m "Add household profile fields to users"
```

---

## Frontend - Alteracoes Necessarias

### 1. Tipos (`apps/web/src/types/index.ts`)

Adicionar tipos de perfil:

```typescript
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  household_income?: number;
  adults_count?: number;
  children_count?: number;
  created_at: string;
  updated_at: string;
}

export interface UserProfileUpdate {
  household_income?: number;
  adults_count?: number;
  children_count?: number;
}
```

### 2. API Client (`apps/web/src/lib/api.ts`)

Adicionar metodos de perfil:

```typescript
async getProfile(): Promise<UserProfile> {
  const response = await this.client.get<UserProfile>('/users/profile');
  return response.data;
}

async updateProfile(data: UserProfileUpdate): Promise<UserProfile> {
  const response = await this.client.patch<UserProfile>('/users/profile', data);
  return response.data;
}
```

### 3. Hook useSettings (`apps/web/src/hooks/use-settings.ts`)

Criar novo hook:

```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { UserProfile, UserProfileUpdate } from '@/types';

const SETTINGS_KEYS = {
  profile: ['settings', 'profile'] as const,
};

export function useProfile() {
  return useQuery({
    queryKey: SETTINGS_KEYS.profile,
    queryFn: async () => {
      return apiClient.getProfile();
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UserProfileUpdate) => {
      return apiClient.updateProfile(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEYS.profile });
    },
  });
}
```

### 4. Pagina Settings (`apps/web/src/app/settings/page.tsx`)

Criar nova pagina:

```typescript
'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useProfile, useUpdateProfile } from '@/hooks/use-settings';

export default function SettingsPage() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const [householdIncome, setHouseholdIncome] = useState('');
  const [adultsCount, setAdultsCount] = useState('');
  const [childrenCount, setChildrenCount] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({
      household_income: parseFloat(householdIncome) || undefined,
      adults_count: parseInt(adultsCount) || undefined,
      children_count: parseInt(childrenCount) || undefined,
    });
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      
      <div className="flex-1 pl-64">
        <Header 
          title="Configuracoes" 
          subtitle="Gerencie seu perfil e preferencias"
        />
        
        <main className="p-6">
          <Card className="max-w-2xl">
            <h2 className="text-xl font-bold mb-6">Meu Perfil</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Renda Mensal da Casa (R$)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={householdIncome}
                  onChange={(e) => setHouseholdIncome(e.target.value)}
                  placeholder="0,00"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Soma da renda das pessoas que arcam com as despesas da casa
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Quantidade de Adultos
                </label>
                <Input
                  type="number"
                  min="0"
                  max="20"
                  value={adultsCount}
                  onChange={(e) => setAdultsCount(e.target.value)}
                  placeholder="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Quantidade de Criancas
                </label>
                <Input
                  type="number"
                  min="0"
                  max="20"
                  value={childrenCount}
                  onChange={(e) => setChildrenCount(e.target.value)}
                  placeholder="0"
                />
              </div>

              <Button
                type="submit"
                disabled={updateProfile.isPending}
              >
                {updateProfile.isPending ? 'Salvando...' : 'Salvar Alteracoes'}
              </Button>
            </form>
          </Card>
        </main>
      </div>
    </div>
  );
}
```

### 5. Sidebar (`apps/web/src/components/layout/sidebar.tsx`)

Adicionar link para configuracoes:

```typescript
const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Notas Fiscais', href: '/invoices', icon: FileText },
  { name: 'Insights', href: '/insights', icon: Lightbulb },
  { name: 'Configuracoes', href: '/settings', icon: Settings },
];
```

---

## Estrutura de Arquivos

### Backend
```
apps/api/src/
├── models/
│   └── user.py (ALTERAR)
├── schemas/
│   └── user.py (ALTERAR)
├── routers/
│   └── users.py (CRIAR)
└── main.py (ALTERAR)
```

### Frontend
```
apps/web/src/
├── app/
│   └── settings/
│       └── page.tsx (CRIAR)
├── components/
│   └── layout/
│       └── sidebar.tsx (ALTERAR)
├── hooks/
│   └── use-settings.ts (CRIAR)
├── lib/
│   └── api.ts (ALTERAR)
└── types/
    └── index.ts (ALTERAR)
```

---

## Endpoints API

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/users/profile` | Obter perfil do usuario |
| PATCH | `/users/profile` | Atualizar perfil do usuario |

---

## Rotas Frontend

| Rota | Arquivo | Descricao |
|-------|----------|-----------|
| `/settings` | `settings/page.tsx` | Pagina de configuracoes |

---

## Proximos Passos

1. Backend
   - [ ] Adicionar campos ao modelo User
   - [ ] Criar schemas UserProfileUpdate e UserProfileResponse
   - [ ] Criar router users.py
   - [ ] Registrar router no main.py
   - [ ] Criar migration alembic
   - [ ] Executar migration

2. Frontend
   - [ ] Adicionar tipos UserProfile e UserProfileUpdate
   - [ ] Adicionar metodos getProfile e updateProfile ao apiClient
   - [ ] Criar hook useSettings
   - [ ] Criar pagina settings/page.tsx
   - [ ] Adicionar link no sidebar

3. Testes
   - [ ] Testar GET /users/profile
   - [ ] Testar PATCH /users/profile
   - [ ] Testar validacao de campos
   - [ ] Testar integracao frontend-backend