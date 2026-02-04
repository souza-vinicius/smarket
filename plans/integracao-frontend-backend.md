# Planejamento de Integracao Frontend-Backend

## Status Atual

### Backend (Implementado)
- Auth: `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/me`
- Invoices: `/invoices/`, `/invoices/{id}`, `/invoices/qrcode`, `/invoices/upload/xml`, `/invoices/{id}`
- Analysis: `/analysis/`, `/analysis/{id}`, `/analysis/dashboard/summary`, `/analysis/{id}/read`, `/analysis/{id}/dismiss`, `/analysis/spending-trends/data`, `/analysis/merchant-insights/data`
- Categories: `/categories/`, `/categories/{id}`, `/categories/{id}/items`

### Frontend (Mockado)
Todos os hooks estao usando dados mockados com comentarios `// TODO: Replace with actual API call`

---

## Fase 1: Autenticacao

### Backend - Ja Implementado
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me`

### Frontend - API Client Ja Implementado
- `apiClient.login()`
- `apiClient.register()`
- `apiClient.getMe()`
- `apiClient.logout()`
- `apiClient.isAuthenticated()`

### Frontend - Hooks ja Implementados
- `useAuth()` - ja conecta com apiClient

### Acao Necessaria
Nenhuma. Autenticacao ja esta integrada.

---

## Fase 2: Notas Fiscais

### Backend - Ja Implementado
| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/invoices/` | Lista notas |
| GET | `/invoices/{id}` | Detalhes da nota |
| POST | `/invoices/qrcode` | Processa QR Code |
| POST | `/invoices/upload/xml` | Upload XML |
| DELETE | `/invoices/{id}` | Remove nota |

### Frontend - Hooks com TODO
```typescript
// useInvoices.ts
export function useInvoices(skip, limit) {
  // TODO: Replace with actual API call
  // return apiClient.get<InvoiceList[]>(`/invoices?skip=${skip}&limit=${limit}`);
}

export function useInvoice(id) {
  // TODO: Replace with actual API call
  // return apiClient.get<Invoice>(`/invoices/${id}`);
}

export function useUploadXML() {
  // TODO: Replace with actual API call
  // return apiClient.uploadFile<Invoice>('/invoices/xml', file);
}

export function useProcessQRCode() {
  // TODO: Replace with actual API call
  // return apiClient.post<Invoice>('/invoices/qrcode', data);
}
```

### Steps de Integracao

1. **Atualizar useInvoices**
   ```typescript
   queryFn: async () => {
     return apiClient.get<InvoiceList[]>(`/invoices?skip=${skip}&limit=${limit}`);
   }
   ```

2. **Atualizar useInvoice**
   ```typescript
   queryFn: async () => {
     return apiClient.get<Invoice>(`/invoices/${id}`);
   }
   ```

3. **Atualizar useUploadXML**
   ```typescript
   mutationFn: async (file: File) => {
     return apiClient.uploadFile<Invoice>('/invoices/upload/xml', file);
   }
   ```

4. **Atualizar useProcessQRCode**
   ```typescript
   mutationFn: async (data: QRCodeRequest) => {
     return apiClient.post<Invoice>('/invoices/qrcode', data);
   }
   ```

---

## Fase 3: Insights e Analises

### Backend - Ja Implementado
| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/analysis/` | Lista insights com filtros |
| GET | `/analysis/{id}` | Detalhes do insight |
| GET | `/analysis/dashboard/summary` | Resumo dashboard |
| POST | `/analysis/{id}/read` | Marcar como lido |
| POST | `/analysis/{id}/dismiss` | Descartar insight |

### Frontend - Hooks com TODO
```typescript
// useInsights.ts
export function useInsights(filters) {
  // TODO: Replace with actual API call
  // const params = new URLSearchParams();
  // if (type) params.append('type', type);
  // if (priority) params.append('priority', priority);
  // if (is_read !== undefined) params.append('is_read', String(is_read));
  // return apiClient.get<Analysis[]>(`/analysis?${params.toString()}`);
}

export function useMarkInsightAsRead() {
  // TODO: Replace with actual API call
  // return apiClient.post<Analysis>(`/analysis/${id}/read`);
}

export function useDismissInsight() {
  // TODO: Replace with actual API call
  // return apiClient.post<Analysis>(`/analysis/${id}/dismiss`);
}
```

### Steps de Integracao

1. **Atualizar useInsights**
   ```typescript
   queryFn: async () => {
     const params = new URLSearchParams();
     if (type) params.append('type', type);
     if (priority) params.append('priority', priority);
     if (is_read !== undefined) params.append('is_read', String(is_read));
     return apiClient.get<Analysis[]>(`/analysis?${params.toString()}`);
   }
   ```

2. **Atualizar useMarkInsightAsRead**
   ```typescript
   mutationFn: async (id: string) => {
     return apiClient.post<Analysis>(`/analysis/${id}/read`);
   }
   ```

3. **Atualizar useDismissInsight**
   ```typescript
   mutationFn: async (id: string) => {
     return apiClient.post<Analysis>(`/analysis/${id}/dismiss`);
   }
   ```

---

## Fase 4: Dashboard

### Backend - Ja Implementado
| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/analysis/dashboard/summary` | Resumo dashboard |

### Frontend - Hook com TODO
```typescript
// useDashboard.ts
export function useDashboardSummary() {
  // TODO: Replace with actual API call
  // return apiClient.get<DashboardSummary>('/analysis/dashboard/summary');
}

export function useRecentInsights(limit) {
  // TODO: Replace with actual API call
  // return apiClient.get<Analysis[]>(`/analysis?limit=${limit}`);
}
```

### Steps de Integracao

1. **Atualizar useDashboardSummary**
   ```typescript
   queryFn: async () => {
     return apiClient.get<DashboardSummary>('/analysis/dashboard/summary');
   }
   ```

2. **Atualizar useRecentInsights**
   ```typescript
   queryFn: async () => {
     return apiClient.get<Analysis[]>(`/analysis?limit=${limit}`);
   }
   ```

---

## Fase 5: Categorias

### Backend - Ja Implementado
| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/categories/` | Lista categorias |
| GET | `/categories/{id}` | Detalhes categoria |
| POST | `/categories/` | Cria categoria |
| PUT | `/categories/{id}` | Atualiza categoria |
| DELETE | `/categories/{id}` | Remove categoria |
| GET | `/categories/{id}/items` | Itens da categoria |

### Frontend - Nao Implementado
- Hook `useCategories` nao existe
- Tela de categorias nao implementada

### Steps de Integracao

1. **Criar hook useCategories**
   ```typescript
   export function useCategories() {
     return useQuery({
       queryKey: ['categories'],
       queryFn: async () => {
         return apiClient.get<Category[]>('/categories');
       },
     });
   }
   ```

2. **Criar hook useCreateCategory**
   ```typescript
   export function useCreateCategory() {
     const queryClient = useQueryClient();
     return useMutation({
       mutationFn: async (data: CategoryCreate) => {
         return apiClient.post<Category>('/categories', data);
       },
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ['categories'] });
       },
     });
   }
   ```

---

## Fase 6: Estabelecimentos

### Backend - Ja Implementado
| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/analysis/merchant-insights/data` | Insights por estabelecimento |

### Frontend - Nao Implementado
- Hook `useMerchants` nao existe
- Tela de estabelecimentos nao implementada

### Steps de Integracao

1. **Criar hook useMerchants**
   ```typescript
   export function useMerchants() {
     return useQuery({
       queryKey: ['merchants'],
       queryFn: async () => {
         return apiClient.get<Merchant[]>('/merchants');
       },
     });
   }
   ```

---

## Resumo de Mudancas

### Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `hooks/use-invoices.ts` | Remover mocks, usar apiClient |
| `hooks/use-insights.ts` | Remover mocks, usar apiClient |
| `hooks/use-dashboard.ts` | Remover mocks, usar apiClient |
| `hooks/use-categories.ts` | Criar novo arquivo |
| `hooks/use-merchants.ts` | Criar novo arquivo |

### Verificacoes Necesarias

1. **Types**
   - `DashboardSummary` ja existe em `types/index.ts`
   - `Analysis` ja existe em `types/index.ts`
   - `Invoice` ja existe em `types/index.ts`
   - `InvoiceList` ja existe em `types/index.ts`

2. **API Client**
   - `apiClient.get()` ja existe
   - `apiClient.post()` ja existe
   - `apiClient.uploadFile()` ja existe

---

## Proxima Tela: Detalhes da Nota Fiscal

### Backend - Ja Implementado
- `GET /invoices/{invoice_id}`

### Frontend - Nao Implementado
- Arquivo `invoices/[id]/page.tsx` nao existe
- Hook `useInvoice(id)` ja existe mas com mock

### Steps

1. Criar `apps/web/src/app/invoices/[id]/page.tsx`
2. Atualizar `useInvoice` para usar API real
3. Exibir detalhes da nota e itens