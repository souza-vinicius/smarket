# SMarket Web - Frontend

Frontend do SMarket, um aplicativo de análise de notas fiscais com insights inteligentes.

## Tecnologias

- **Next.js 14** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **React Query** - Gerenciamento de dados e cache
- **Recharts** - Gráficos e visualizações
- **Lucide React** - Ícones

## Instalação

```bash
cd apps/web
npm install
```

## Desenvolvimento

```bash
npm run dev
```

O aplicativo estará disponível em `http://localhost:3000`

## Build para Produção

```bash
npm run build
npm start
```

## Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Estrutura do Projeto

```
src/
├── app/              # Páginas do Next.js (App Router)
│   ├── layout.tsx    # Layout principal
│   ├── page.tsx      # Dashboard (página inicial)
│   └── globals.css   # Estilos globais
├── components/        # Componentes reutilizáveis
├── lib/             # Utilitários e cliente HTTP
├── hooks/           # Custom React hooks
└── types/           # Tipos TypeScript
```

## Funcionalidades

### Dashboard
- Resumo de gastos do mês
- Comparação com mês anterior
- Insights recentes
- Ações rápidas (upload de notas)

### Insights
- Alertas de preços acima da média
- Análises por categoria
- Padrões de compra por estabelecimento
- Recomendações de economia

### Notas Fiscais
- Upload de arquivos XML
- Upload via QR Code
- Listagem de notas
- Detalhes de cada nota

## Integração com API

O frontend se comunica com a API backend em `http://localhost:8000` (configurável via `NEXT_PUBLIC_API_URL`).

Endpoints principais:
- `GET /api/v1/analysis/dashboard/summary` - Resumo do dashboard
- `GET /api/v1/analysis/` - Lista de insights
- `GET /api/v1/invoices/` - Lista de notas fiscais
- `POST /api/v1/invoices/upload/xml` - Upload de XML
- `POST /api/v1/invoices/qrcode` - Upload via QR Code

## Desenvolvimento Futuro

- [ ] Página de tendências de gastos
- [ ] Página de comparação de preços
- [ ] Gráficos interativos
- [ ] Filtros avançados
- [ ] Exportação de dados
- [ ] Modo escuro
- [ ] Notificações push
