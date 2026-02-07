# Guia de Configuração ESLint - SMarket Web

Este documento detalha todas as regras ESLint configuradas no projeto SMarket Web, explicando seu propósito, benefícios e como segui-las corretamente.

## 📋 Visão Geral

O projeto SMarket Web utiliza uma configuração ESLint abrangente que cobre:

- **TypeScript** - Type checking rigoroso e melhores práticas
- **React** - Padrões modernos de desenvolvimento React
- **Acessibilidade (a11y)** - Garantia de acessibilidade web
- **Organização de Imports** - Consistência e clareza
- **Tailwind CSS** - Uso correto das classes utilitárias
- **Segurança** - Prevenção de vulnerabilidades comuns
- **Melhores Práticas** - Código limpo e manutenível

A configuração está definida em [`eslint.config.mjs`](eslint.config.mjs) e utiliza o formato Flat Config do ESLint.

---

## 🔌 Plugins Utilizados

| Plugin | Versão | Propósito |
|--------|--------|-----------|
| [`@eslint/js`](https://eslint.org/docs/latest/rules/) | ^8.56.0 | Regras base recomendadas do ESLint |
| [`@typescript-eslint`](https://typescript-eslint.io/rules/) | ^7.0.0 | Regras específicas para TypeScript |
| [`eslint-plugin-react`](https://github.com/jsx-eslint/eslint-plugin-react) | ^7.33.2 | Regras para React e JSX |
| [`eslint-plugin-react-hooks`](https://reactjs.org/docs/hooks-rules.html) | ^4.6.0 | Validação das regras dos Hooks |
| [`eslint-plugin-jsx-a11y`](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) | ^6.8.0 | Verificação de acessibilidade |
| [`eslint-plugin-import`](https://github.com/import-js/eslint-plugin-import) | ^2.29.1 | Organização e validação de imports |
| [`eslint-plugin-tailwindcss`](https://github.com/francoismassart/eslint-plugin-tailwindcss) | ^3.14.0 | Validação de classes Tailwind |
| [`eslint-plugin-security`](https://github.com/eslint-community/eslint-plugin-security) | ^2.1.0 | Detecção de vulnerabilidades de segurança |

---

## 🔷 TypeScript (@typescript-eslint)

### Regras de Type Checking

#### `@typescript-eslint/no-floating-promises`
**Severidade:** `error`

Garante que Promises sejam tratadas adequadamente, evitando operações assíncronas não aguardadas.

```typescript
// ❌ Código incorreto - Promise não aguardada
async function fetchData() {
  fetch('/api/data'); // Erro: Promise flutuante
}

// ✅ Código correto
async function fetchData() {
  await fetch('/api/data'); // Promise aguardada
}

// ✅ Também correto - tratamento explícito
async function fetchData() {
  fetch('/api/data').catch(console.error);
}
```

---

#### `@typescript-eslint/await-thenable`
**Severidade:** `error`

Evita o uso de `await` em valores que não são Thenable (não são Promises).

```typescript
// ❌ Código incorreto
async function example() {
  const value = 42;
  const result = await value; // Erro: valor não é uma Promise
}

// ✅ Código correto
async function example() {
  const value = Promise.resolve(42);
  const result = await value;
}
```

---

#### `@typescript-eslint/no-misused-promises`
**Severidade:** `error`

Evita o uso incorreto de Promises, como passar uma função async onde uma função síncrona é esperada.

```typescript
// ❌ Código incorreto
const button = document.getElementById('btn');
button.addEventListener('click', async () => { // Erro: handler retorna Promise
  await saveData();
});

// ✅ Código correto
const button = document.getElementById('btn');
button.addEventListener('click', () => {
  void saveData(); // Explicitamente ignora a Promise
});
```

---

### Regras de Tipagem

#### `@typescript-eslint/no-explicit-any`
**Severidade:** `warn` (relaxed para codebase existente)

Discourages o uso de `any`, que remove a segurança de tipos do TypeScript.

```typescript
// ❌ Código incorreto
function processData(data: any) {
  return data.value; // Sem verificação de tipo
}

// ✅ Código correto
interface Data {
  value: string;
}

function processData(data: Data) {
  return data.value;
}

// ✅ Alternativa com unknown (mais seguro)
function processData(data: unknown) {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return (data as { value: string }).value;
  }
}
```

---

#### `@typescript-eslint/explicit-function-return-type`
**Severidade:** `warn`

Recomenda a definição explícita de tipos de retorno em funções.

```typescript
// ❌ Código incorreto
function calculateTotal(price, quantity) {
  return price * quantity;
}

// ✅ Código correto
function calculateTotal(price: number, quantity: number): number {
  return price * quantity;
}

// ✅ Expressões de função são permitidas
const multiply = (a: number, b: number) => a * b;
```

**Configuração:**
- `allowExpressions: true` - Permite inferência em expressões
- `allowTypedFunctionExpressions: true` - Permite inferência com tipos definidos
- `allowHigherOrderFunctions: true` - Permite inferência em HOFs

---

#### `@typescript-eslint/consistent-type-imports`
**Severidade:** `error`

Exige o uso de `import type` para imports que são usados apenas como tipos.

```typescript
// ❌ Código incorreto
import { User } from './types';

const user: User = { name: 'John' };

// ✅ Código correto
import type { User } from './types';

const user: User = { name: 'John' };

// ✅ Também correto (inline)
import { type User, apiClient } from './types';
```

---

### Regras de Variáveis

#### `@typescript-eslint/no-unused-vars`
**Severidade:** `error`

Detecta variáveis declaradas mas não utilizadas, com exceção para variáveis prefixadas com `_`.

```typescript
// ❌ Código incorreto
function example() {
  const unused = 'value'; // Erro: variável não usada
  return 42;
}

// ✅ Código correto - prefixo _ ignora a regra
function example(_unused: string) {
  return 42;
}

// ✅ Código correto - variável utilizada
function example(name: string) {
  console.log(name);
  return 42;
}

// ✅ Código correto - destructuring com ignore
const { data: _data, error } = await fetchData();
```

**Configuração:**
- `argsIgnorePattern: "^_"` - Ignora argumentos com prefixo `_`
- `varsIgnorePattern: "^_"` - Ignora variáveis com prefixo `_`
- `caughtErrorsIgnorePattern: "^_"` - Ignora erros de catch com prefixo `_`

---

#### `@typescript-eslint/no-shadow`
**Severidade:** `error`

Evita que variáveis declarem nomes já usados em escopos externos.

```typescript
// ❌ Código incorreto
const name = 'global';

function example() {
  const name = 'local'; // Erro: sombreamento da variável global
  return name;
}

// ✅ Código correto
const name = 'global';

function example() {
  const localName = 'local'; // Nome diferente
  return localName;
}
```

---

### Regras de Operadores

#### `@typescript-eslint/prefer-nullish-coalescing`
**Severidade:** `warn`

Recomenda o uso do operador `??` em vez de `||` para valores padrão.

```typescript
// ❌ Código incorreto - pode causar bugs
const value = userInput || 'default'; // 0 ou '' também usariam o default

// ✅ Código correto
const value = userInput ?? 'default'; // Apenas null/undefined usam default
```

---

#### `@typescript-eslint/prefer-optional-chain`
**Severidade:** `error`

Recomenda o uso de optional chaining (`?.`) em vez de verificações manuais.

```typescript
// ❌ Código incorreto - verboso
const name = user && user.profile && user.profile.name;

// ✅ Código correto - conciso
const name = user?.profile?.name;
```

---

### Regras de Segurança de Tipos

#### `@typescript-eslint/no-unsafe-*`
**Severidade:** `warn`

Conjunto de regras que detectam operações inseguras com valores `any`:
- `no-unsafe-assignment` - Atribuições inseguras
- `no-unsafe-member-access` - Acesso a propriedades inseguro
- `no-unsafe-call` - Chamadas de função inseguras
- `no-unsafe-return` - Retornos inseguros

```typescript
// ❌ Código incorreto
const data: any = fetchData();
const value = data.property; // Acesso inseguro
process(data); // Chamada insegura

// ✅ Código correto
const data: Data = fetchData();
const value = data.property;
process(data);
```

---

## ⚛️ React (eslint-plugin-react)

### Regras de JSX

#### `react/jsx-key`
**Severidade:** `error`

Exige a propriedade `key` em elementos de listas para otimização do React.

```tsx
// ❌ Código incorreto
const List = ({ items }) => (
  <ul>
    {items.map((item) => (
      <li>{item.name}</li> // Erro: falta a key
    ))}
  </ul>
);

// ✅ Código correto
const List = ({ items }) => (
  <ul>
    {items.map((item) => (
      <li key={item.id}>{item.name}</li>
    ))}
  </ul>
);

// ✅ Também verifica fragments
const List = ({ items }) => (
  <>
    {items.map((item) => (
      <React.Fragment key={item.id}>
        <span>{item.name}</span>
      </React.Fragment>
    ))}
  </>
);
```

---

#### `react/jsx-no-target-blank`
**Severidade:** `error`

Previne vulnerabilidades de segurança em links externos.

```tsx
// ❌ Código incorreto - vulnerável a tabnabbing
<a href="https://externo.com" target="_blank">
  Link Externo
</a>

// ✅ Código correto
<a href="https://externo.com" target="_blank" rel="noopener noreferrer">
  Link Externo
</a>

// ✅ Com componente Link do Next.js
<Link href="https://externo.com" target="_blank" rel="noopener noreferrer">
  Link Externo
</Link>
```

---

#### `react/self-closing-comp`
**Severidade:** `error`

Recomenda o uso de tags auto-fechadas quando não há children.

```tsx
// ❌ Código incorreto
<div></div>
<Component></Component>

// ✅ Código correto
<div />
<Component />

// ✅ Mantém tags quando há children
<div>Conteúdo</div>
<Component>Children</Component>
```

---

#### `react/no-array-index-key`
**Severidade:** `warn`

Avisa contra o uso de índices de array como keys (pode causar bugs).

```tsx
// ❌ Código incorreto - pode causar problemas de renderização
const List = ({ items }) => (
  <ul>
    {items.map((item, index) => (
      <li key={index}>{item.name}</li>
    ))}
  </ul>
);

// ✅ Código correto - use IDs únicos
const List = ({ items }) => (
  <ul>
    {items.map((item) => (
      <li key={item.id}>{item.name}</li>
    ))}
  </ul>
);

// ⚠️ Aceitável apenas se a lista nunca mudar
const StaticList = () => (
  <ul>
    {['A', 'B', 'C'].map((item, index) => (
      <li key={index}>{item}</li>
    ))}
  </ul>
);
```

---

#### `react/no-danger`
**Severidade:** `warn`

Avisa sobre o uso de `dangerouslySetInnerHTML` (risco de XSS).

```tsx
// ⚠️ Código com aviso - use com cuidado
function HtmlContent({ html }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

// ✅ Alternativa segura - sanitize primeiro
import DOMPurify from 'dompurify';

function HtmlContent({ html }) {
  const cleanHtml = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
}
```

---

### Regras de Depreciação

#### `react/no-deprecated`
**Severidade:** `error`

Proíbe o uso de métodos e APIs depreciados do React.

```tsx
// ❌ Código incorreto - método depreciado
class Component extends React.Component {
  componentWillMount() { // Erro: método depreciado
    // ...
  }
}

// ✅ Código correto - use hooks modernos
function Component() {
  useEffect(() => {
    // ...
  }, []);
}
```

---

#### `react/no-find-dom-node`
**Severidade:** `error`

Proíbe o uso de `ReactDOM.findDOMNode` (depreciado).

```tsx
// ❌ Código incorreto
class Component extends React.Component {
  componentDidMount() {
    const node = ReactDOM.findDOMNode(this); // Erro: API depreciada
  }
}

// ✅ Código correto - use refs
function Component() {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (ref.current) {
      // Acesse o nó DOM
    }
  }, []);
  
  return <div ref={ref} />;
}
```

---

### Regras de TypeScript

#### `react/prop-types`
**Severidade:** `off`

Desabilitado pois o TypeScript já fornece verificação de tipos para props.

```tsx
// ✅ Não é necessário PropTypes com TypeScript
interface ButtonProps {
  label: string;
  onClick: () => void;
}

function Button({ label, onClick }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
}
```

---

#### `react/react-in-jsx-scope`
**Severidade:** `off`

Desabilitado pois o Next.js com JSX Transform não requer importação do React.

```tsx
// ✅ Não é necessário importar React no Next.js
// import React from 'react'; // Desnecessário

function Component() {
  return <div>Hello</div>;
}
```

---

## 🎣 React Hooks (eslint-plugin-react-hooks)

### Regras dos Hooks

#### `react-hooks/rules-of-hooks`
**Severidade:** `error`

Garante que os Hooks sejam chamados apenas no nível superior de componentes React.

```tsx
// ❌ Código incorreto - Hook em condicional
function Component({ shouldFetch }) {
  if (shouldFetch) {
    const data = useQuery(); // Erro: Hook em condicional
  }
}

// ❌ Código incorreto - Hook em loop
function Component({ items }) {
  items.forEach(() => {
    useEffect(() => {}, []); // Erro: Hook em loop
  });
}

// ❌ Código incorreto - Hook em função regular
function regularFunction() {
  const state = useState(); // Erro: Hook fora de componente React
}

// ✅ Código correto
function Component({ shouldFetch }) {
  const data = useQuery({
    enabled: shouldFetch, // Use opções do hook
  });
}
```

---

#### `react-hooks/exhaustive-deps`
**Severidade:** `warn`

Avisa quando as dependências de `useEffect`, `useCallback` ou `useMemo` estão incompletas.

```tsx
// ❌ Código incorreto - dependência faltando
function Component({ userId }) {
  const [data, setData] = useState();
  
  useEffect(() => {
    fetchUser(userId).then(setData);
  }, []); // Aviso: userId não está nas dependências
}

// ✅ Código correto
function Component({ userId }) {
  const [data, setData] = useState();
  
  useEffect(() => {
    fetchUser(userId).then(setData);
  }, [userId]); // Todas as dependências incluídas
}

// ✅ Ignorar intencionalmente (com eslint-disable)
function Component() {
  useEffect(() => {
    // Executa apenas uma vez na montagem
    initializeApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
```

---

## ♿ Acessibilidade (eslint-plugin-jsx-a11y)

### Regras de Imagens

#### `jsx-a11y/alt-text`
**Severidade:** `error`

Exige texto alternativo para elementos de imagem.

```tsx
// ❌ Código incorreto
<img src="photo.jpg" />
<Image src="photo.jpg" />

// ✅ Código correto
<img src="photo.jpg" alt="Descrição da imagem" />
<Image src="photo.jpg" alt="Descrição da imagem" />

// ✅ Imagens decorativas
<img src="decoration.jpg" alt="" />
<Image src="decoration.jpg" alt="" />
```

---

#### `jsx-a11y/img-redundant-alt`
**Severidade:** `error`

Evita texto alternativo redundante como "imagem de" ou "foto de".

```tsx
// ❌ Código incorreto
<img src="cat.jpg" alt="imagem de um gato" />
<img src="cat.jpg" alt="foto de um gato" />

// ✅ Código correto
<img src="cat.jpg" alt="Gato persa dormindo em um sofá" />
```

---

### Regras de Links e Botões

#### `jsx-a11y/anchor-is-valid`
**Severidade:** `error`

Garante que âncoras sejam usadas corretamente.

```tsx
// ❌ Código incorreto
<a onClick={handleClick}>Clique aqui</a>
<a href="#">Clique aqui</a>

// ✅ Código correto - use button para ações
<button onClick={handleClick}>Clique aqui</button>

// ✅ Código correto - links válidos
<a href="/pagina">Ir para página</a>
<Link href="/pagina">Ir para página</Link>
```

---

#### `jsx-a11y/anchor-has-content`
**Severidade:** `error`

Exige que links tenham conteúdo acessível.

```tsx
// ❌ Código incorreto
<a href="/home"></a>
<a href="/home"><span aria-hidden="true">→</span></a>

// ✅ Código correto
<a href="/home">Home</a>
<a href="/home" aria-label="Página inicial">→</a>
```

---

### Regras de Interatividade

#### `jsx-a11y/click-events-have-key-events`
**Severidade:** `error`

Exige que elementos com `onClick` também respondam a eventos de teclado.

```tsx
// ❌ Código incorreto
<div onClick={handleClick}>Clique aqui</div>

// ✅ Código correto - use elemento semântico
<button onClick={handleClick}>Clique aqui</button>

// ✅ Código correto - com suporte a teclado
<div
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  role="button"
  tabIndex={0}
>
  Clique aqui
</div>
```

---

#### `jsx-a11y/interactive-supports-focus`
**Severidade:** `error`

Garante que elementos interativos sejam focáveis.

```tsx
// ❌ Código incorreto
<div onClick={handleClick} role="button">Clique</div>

// ✅ Código correto
<div onClick={handleClick} role="button" tabIndex={0}>Clique</div>

// ✅ Melhor ainda - use button
<button onClick={handleClick}>Clique</button>
```

---

#### `jsx-a11y/no-static-element-interactions`
**Severidade:** `error`

Evita handlers de eventos em elementos estáticos sem papel semântico.

```tsx
// ❌ Código incorreto
<div onClick={handleClick}>Clique</div>
<span onMouseEnter={handleHover}>Hover</span>

// ✅ Código correto
<button onClick={handleClick}>Clique</button>
<div role="button" onClick={handleClick} tabIndex={0}>Clique</div>
```

---

### Regras de Formulários

#### `jsx-a11y/label-has-associated-control`
**Severidade:** `error`

Exige que labels estejam associadas a controles de formulário.

```tsx
// ❌ Código incorreto
<label>Nome</label>
<input id="name" />

// ✅ Código correto - htmlFor
<label htmlFor="name">Nome</label>
<input id="name" />

// ✅ Código correto - label envolvendo input
<label>
  Nome
  <input />
</label>

// ✅ Código correto - aria-label
<input aria-label="Nome" />
```

---

### Regras de Mídia

#### `jsx-a11y/media-has-caption`
**Severidade:** `warn`

Recomenda legendas para conteúdo de mídia.

```tsx
// ⚠️ Código com aviso
<video src="video.mp4" controls />

// ✅ Código correto
<video src="video.mp4" controls>
  <track kind="captions" src="captions.vtt" label="Português" />
</video>
```

---

### Regras de Documento

#### `jsx-a11y/html-has-lang`
**Severidade:** `error`

Exige que o elemento `<html>` tenha um atributo `lang`.

```tsx
// ❌ Código incorreto (em _document.tsx ou layout)
<html>

// ✅ Código correto
<html lang="pt-BR">
```

---

#### `jsx-a11y/iframe-has-title`
**Severidade:** `error`

Exige que iframes tenham um título descritivo.

```tsx
// ❌ Código incorreto
<iframe src="https://maps.google.com" />

// ✅ Código correto
<iframe src="https://maps.google.com" title="Mapa da localização" />
```

---

### Regras de Navegação

#### `jsx-a11y/no-access-key`
**Severidade:** `error`

Proíbe o uso de `accessKey` (pode conflitar com atalhos do navegador).

```tsx
// ❌ Código incorreto
<button accessKey="s">Salvar</button>

// ✅ Código correto
<button>Salvar</button>
```

---

#### `jsx-a11y/tabindex-no-positive`
**Severidade:** `error`

Evita valores positivos de `tabIndex` (quebram ordem natural de tabulação).

```tsx
// ❌ Código incorreto
<div tabIndex={1}>Primeiro</div>
<div tabIndex={2}>Segundo</div>

// ✅ Código correto - ordem natural do DOM
<div>Primeiro</div>
<div>Segundo</div>

// ✅ Código correto - tabIndex 0 para elementos customizados
<div role="button" tabIndex={0}>Focável</div>

// ✅ Código correto - tabIndex -1 para foco programático
<div ref={modalRef} tabIndex={-1}>Modal</div>
```

---

## 📦 Imports (eslint-plugin-import)

### Regras de Organização

#### `import/order`
**Severidade:** `error`

Organiza os imports em grupos específicos com separação por linhas.

```typescript
// ❌ Código incorreto - desorganizado
import { Button } from '@/components/ui/button';
import React from 'react';
import axios from 'axios';
import { useState } from 'react';

// ✅ Código correto - organizado
// 1. Built-in (react, next)
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

// 2. External (third-party)
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';

// 3. Internal (@/)
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

// 4. Parent/Sibling
import { helper } from '../utils';

// 5. Types
import type { User } from '@/types';
```

**Configuração de grupos:**
1. `builtin` - Módulos nativos (react, next)
2. `external` - Dependências de terceiros
3. `internal` - Imports com `@/`
4. `parent/sibling` - Imports relativos
5. `index` - Imports de index
6. `object` - Imports de objetos
7. `type` - Imports de tipos

---

#### `import/no-duplicates`
**Severidade:** `error`

Evita imports duplicados do mesmo módulo.

```typescript
// ❌ Código incorreto
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/button';

// ✅ Código correto
import { Button, Input } from '@/components/ui/button';

// ❌ Também incorreto
import type { User } from '@/types';
import { api } from '@/types';

// ✅ Código correto
import { api, type User } from '@/types';
```

---

#### `import/no-cycle`
**Severidade:** `error`

Previne dependências circulares entre módulos.

```typescript
// ❌ Ciclo: A.ts -> B.ts -> A.ts
// A.ts
import { b } from './B';
export const a = () => b();

// B.ts
import { a } from './A'; // Erro: dependência circular
export const b = () => a();

// ✅ Solução - extraia para um terceiro módulo
// types.ts
export type Callback = () => void;

// A.ts
import type { Callback } from './types';
export const a: Callback = () => {};

// B.ts
import type { Callback } from './types';
export const b: Callback = () => {};
```

---

#### `import/first`
**Severidade:** `error`

Exige que todos os imports estejam no topo do arquivo.

```typescript
// ❌ Código incorreto
const config = {};
import React from 'react'; // Erro: import não está no topo

// ✅ Código correto
import React from 'react';

const config = {};
```

---

#### `import/newline-after-import`
**Severidade:** `error`

Exige uma linha em branco após os imports.

```typescript
// ❌ Código incorreto
import React from 'react';
const App = () => <div />;

// ✅ Código correto
import React from 'react';

const App = () => <div />;
```

---

#### `import/no-mutable-exports`
**Severidade:** `error`

Proíbe exports de variáveis mutáveis (`let` e `var`).

```typescript
// ❌ Código incorreto
export let count = 0;
export var config = {};

// ✅ Código correto
export const count = 0;
export const config = {};

// ✅ Se precisar de mutação, exporte funções
let _count = 0;
export const getCount = () => _count;
export const increment = () => { _count++; };
```

---

## 🎨 Tailwind CSS (eslint-plugin-tailwindcss)

### Regras de Classes

#### `tailwindcss/classnames-order`
**Severidade:** `warn`

Recomenda a ordenação consistente das classes Tailwind.

```tsx
// ⚠️ Código com aviso - ordem incorreta
<div className="text-red-500 p-4 flex bg-blue-500">

// ✅ Código correto - ordem recomendada
<div className="flex bg-blue-500 p-4 text-red-500">
```

**Ordem recomendada:** Layout → Flexbox/Grid → Spacing → Sizing → Typography → Backgrounds → Borders → Effects

---

#### `tailwindcss/enforces-shorthand`
**Severidade:** `warn`

Recomenda o uso de classes shorthand quando possível.

```tsx
// ⚠️ Código com aviso
<div className="pl-4 pr-4">

// ✅ Código correto
<div className="px-4">

// ⚠️ Código com aviso
<div className="mt-2 mb-2 ml-2 mr-2">

// ✅ Código correto
<div className="m-2">
```

---

#### `tailwindcss/no-contradicting-classname`
**Severidade:** `error`

Detecta classes Tailwind conflitantes na mesma declaração.

```tsx
// ❌ Código incorreto - classes conflitantes
<div className="flex block"> {/* Ambos definem display */}
<div className="text-red-500 text-blue-500"> {/* Ambos definem cor */}
<div className="p-4 p-2"> {/* Padding duplicado */}

// ✅ Código correto
<div className="flex">
<div className="text-red-500">
<div className="p-4">

// ✅ Classes condicionais são permitidas
<div className={isActive ? 'text-red-500' : 'text-blue-500'}>
```

---

#### `tailwindcss/enforces-negative-arbitrary-values`
**Severidade:** `warn`

Recomenda o uso do prefixo `-` para valores arbitrários negativos.

```tsx
// ⚠️ Código com aviso
<div className="top-[-10px]">

// ✅ Código correto
<div className="-top-[10px]">
```

---

### Configuração do Plugin

```javascript
settings: {
  tailwindcss: {
    callees: ["cn", "clsx", "twMerge", "cva"],
    config: "tailwind.config.ts",
  },
}
```

O plugin reconhece funções utilitárias como `cn` (de [`@/lib/utils`](src/lib/utils.ts)) para validar classes dentro delas:

```tsx
// ✅ Classes dentro de cn() são validadas
import { cn } from '@/lib/utils';

<div className={cn(
  'flex items-center', // ✅ Ordenado
  isActive && 'bg-blue-500', // ✅ Sem conflitos
)} />
```

---

## 🔒 Segurança (eslint-plugin-security)

### Regras de Detecção

#### `security/detect-unsafe-regex`
**Severidade:** `error`

Detecta expressões regulares potencialmente perigosas (ReDoS).

```typescript
// ❌ Código incorreto - vulnerável a ReDoS
const regex = /(a+)+$/;

// ✅ Código correto - regex segura
const regex = /^a+$/;

// ✅ Use bibliotecas validadas para validação complexa
import validator from 'validator';
validator.isEmail(email);
```

---

#### `security/detect-eval-with-expression`
**Severidade:** `error`

Proíbe o uso de `eval()` com expressões dinâmicas.

```typescript
// ❌ Código incorreto - execução de código arbitrário
const userInput = getInput();
eval(userInput);

// ❌ Também perigoso
const code = `console.log('${userInput}')`;
eval(code);

// ✅ Alternativas seguras
// 1. JSON.parse para dados
const data = JSON.parse(jsonString);

// 2. Funções específicas
const operations = {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b,
};
const result = operations[operation](a, b);
```

---

#### `security/detect-object-injection`
**Severidade:** `warn`

Avisa sobre potencial prototype pollution via acesso dinâmico a propriedades.

```typescript
// ⚠️ Código com aviso
const value = object[userInput];

// ✅ Código correto - verifique a chave
if (Object.prototype.hasOwnProperty.call(object, userInput)) {
  const value = object[userInput];
}

// ✅ Ou use Map
const map = new Map();
map.set(userInput, value);
const retrieved = map.get(userInput);
```

---

#### `security/detect-non-literal-fs-filename`
**Severidade:** `warn`

Avisa sobre uso de caminhos de arquivo não literais.

```typescript
// ⚠️ Código com aviso
const filename = req.query.file;
fs.readFile(filename, callback);

// ✅ Código correto - sanitize o caminho
import path from 'path';

const filename = req.query.file;
const safePath = path.join(UPLOAD_DIR, path.basename(filename));
fs.readFile(safePath, callback);
```

---

#### `security/detect-pseudoRandomBytes`
**Severidade:** `error`

Proíbe o uso de `pseudoRandomBytes` para criptografia.

```typescript
// ❌ Código incorreto - não criptograficamente seguro
import { pseudoRandomBytes } from 'crypto';
const token = pseudoRandomBytes(32);

// ✅ Código correto
import { randomBytes } from 'crypto';
const token = randomBytes(32);
```

---

## ✅ Melhores Práticas Gerais

### Regras de Console

#### `no-console`
**Severidade:** `warn` (apenas `log`, permite `warn` e `error`)

Discourages o uso de `console.log` em produção.

```typescript
// ⚠️ Código com aviso
console.log('Debug info');

// ✅ Permitido
console.warn('Aviso');
console.error('Erro:', error);

// ✅ Use um logger apropriado
import { logger } from '@/lib/logger';
logger.info('Informação');
```

---

#### `no-debugger`
**Severidade:** `error`

Proíbe o uso de statements `debugger`.

```typescript
// ❌ Código incorreto
function process() {
  debugger; // Erro: não commitar código com debugger
  return result;
}
```

---

### Regras de Variáveis

#### `no-var`
**Severidade:** `error`

Proíbe o uso de `var`, exigindo `const` ou `let`.

```typescript
// ❌ Código incorreto
var count = 0;

// ✅ Código correto
const count = 0; // Valor não muda
let index = 0;   // Valor muda
```

---

#### `prefer-const`
**Severidade:** `error`

Recomenda `const` para variáveis que nunca são reatribuídas.

```typescript
// ❌ Código incorreto
let name = 'John'; // Nunca é reatribuída
console.log(name);

// ✅ Código correto
const name = 'John';
console.log(name);
```

---

### Regras de Sintaxe

#### `prefer-arrow-callback`
**Severidade:** `error`

Recomenda arrow functions para callbacks.

```typescript
// ❌ Código incorreto
items.map(function (item) {
  return item.name;
});

// ✅ Código correto
items.map((item) => item.name);
```

---

#### `prefer-template`
**Severidade:** `error`

Recomenda template literals em vez de concatenação.

```typescript
// ❌ Código incorreto
const message = 'Hello, ' + name + '!';

// ✅ Código correto
const message = `Hello, ${name}!`;
```

---

#### `prefer-destructuring`
**Severidade:** `warn` (apenas objetos)

Recomenda destructuring para extrair valores.

```typescript
// ⚠️ Código com aviso
const name = user.name;
const email = user.email;

// ✅ Código correto
const { name, email } = user;

// ✅ Arrays são opcionais (config: array: false)
const first = arr[0]; // Permitido
```

---

#### `object-shorthand`
**Severidade:** `error`

Requer shorthand para propriedades de objetos.

```typescript
// ❌ Código incorreto
const obj = {
  name: name,
  getValue: function() { return 42; },
};

// ✅ Código correto
const obj = {
  name,
  getValue() { return 42; },
};
```

---

#### `eqeqeq`
**Severidade:** `error` (ignora comparações com null)

Exige uso de `===` e `!==` em vez de `==` e `!=`.

```typescript
// ❌ Código incorreto
if (value == 5) { /* ... */ }
if (value != null) { /* ... */ }

// ✅ Código correto
if (value === 5) { /* ... */ }
if (value !== null) { /* ... */ }

// ✅ Comparação com null é permitida (null == undefined é true)
if (value == null) { /* aceita null e undefined */ }
```

---

#### `curly`
**Severidade:** `error`

Exige chaves em todas as estruturas de controle.

```typescript
// ❌ Código incorreto
if (condition) doSomething();

while (condition)
  doSomething();

// ✅ Código correto
if (condition) {
  doSomething();
}

while (condition) {
  doSomething();
}
```

---

### Regras de Qualidade de Código

#### `complexity`
**Severidade:** `warn` (máximo: 25)

Avisa quando a complexidade ciclomática é alta.

```typescript
// ⚠️ Código com aviso - muitos caminhos
function process(value) {
  if (a) {
    if (b) {
      if (c) { /* ... */ }
      else if (d) { /* ... */ }
      else if (e) { /* ... */ }
      // ... muitos branches
    }
  }
}

// ✅ Refatore para reduzir complexidade
function process(value) {
  if (!a) return null;
  if (!b) return null;
  return processValidValue(value);
}
```

---

#### `max-lines`
**Severidade:** `warn` (máximo: 600)

Avisa quando um arquivo tem muitas linhas.

```typescript
// ⚠️ Arquivo com mais de 600 linhas
// Considere dividir em módulos menores
```

---

#### `max-lines-per-function`
**Severidade:** `warn` (máximo: 200)

Avisa quando uma função é muito longa.

```typescript
// ⚠️ Função com mais de 200 linhas
function processEverything() {
  // ... 200+ linhas de código
}

// ✅ Divida em funções menores
function validate(data) { /* ... */ }
function transform(data) { /* ... */ }
function save(data) { /* ... */ }

function processEverything() {
  validate(data);
  transform(data);
  save(data);
}
```

---

#### `max-params`
**Severidade:** `warn` (máximo: 5)

Avisa quando uma função tem muitos parâmetros.

```typescript
// ⚠️ Código com aviso
function createUser(
  name,
  email,
  phone,
  address,
  city,
  country // 6º parâmetro
) { /* ... */ }

// ✅ Use um objeto
interface CreateUserParams {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
}

function createUser(params: CreateUserParams) { /* ... */ }
```

---

### Regras de Modern JavaScript

#### `prefer-rest-params`
**Severidade:** `error`

Recomenda rest parameters em vez de `arguments`.

```typescript
// ❌ Código incorreto
function sum() {
  return Array.from(arguments).reduce((a, b) => a + b, 0);
}

// ✅ Código correto
function sum(...numbers: number[]) {
  return numbers.reduce((a, b) => a + b, 0);
}
```

---

#### `prefer-spread`
**Severidade:** `error`

Recomenda spread operator em vez de `apply()`.

```typescript
// ❌ Código incorreto
const max = Math.max.apply(null, numbers);

// ✅ Código correto
const max = Math.max(...numbers);
```

---

#### `prefer-object-spread`
**Severidade:** `error`

Recomenda spread em vez de `Object.assign()`.

```typescript
// ❌ Código incorreto
const merged = Object.assign({}, obj1, obj2);

// ✅ Código correto
const merged = { ...obj1, ...obj2 };
```

---

## 🚀 Scripts Disponíveis

Os seguintes comandos estão disponíveis no [`package.json`](package.json):

| Comando | Descrição |
|---------|-----------|
| `npm run lint` | Executa o ESLint em todo o projeto |
| `npm run lint:fix` | Executa o ESLint e corrige problemas automaticamente |
| `npm run lint:report` | Gera um relatório JSON dos problemas encontrados |
| `npm run type-check` | Executa o TypeScript para verificação de tipos |

### Exemplos de Uso

```bash
# Verificar todo o código
cd apps/web
npm run lint

# Corrigir problemas automaticamente
npm run lint:fix

# Gerar relatório para CI
npm run lint:report

# Verificar tipos
npm run type-check

# Combinar verificações
npm run lint && npm run type-check
```

---

## 🔧 Como Corrigir Problemas Comuns

### Problema: `import/order` - Imports desorganizados

**Solução:** Organize os imports na ordem correta:

```typescript
// 1. React/Next
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// 2. Third-party
import axios from 'axios';

// 3. Internal (@/)
import { Button } from '@/components/ui/button';

// 4. Relative
import { helper } from '../utils';
```

Use `--fix` para correção automática:
```bash
npm run lint:fix
```

---

### Problema: `@typescript-eslint/no-unused-vars` - Variáveis não usadas

**Solução:**
1. Remova a variável se não for necessária
2. Ou use o prefixo `_` para ignorar:

```typescript
// Ignore argumentos não usados
function callback(_event: Event, value: string) {
  console.log(value);
}

// Ignore em destructuring
const { data: _data, error } = result;
```

---

### Problema: `react-hooks/exhaustive-deps` - Dependências faltando

**Solução:** Adicione todas as dependências usadas dentro do hook:

```typescript
// ❌ Incorreto
useEffect(() => {
  fetchUser(userId);
}, []); // userId faltando

// ✅ Correto
useEffect(() => {
  fetchUser(userId);
}, [userId]);

// ✅ Ou use eslint-disable com justificativa
useEffect(() => {
  // Executa apenas na montagem
  initializeApp();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

---

### Problema: `tailwindcss/classnames-order` - Classes desordenadas

**Solução:** Use `--fix` para reordenar automaticamente:

```bash
npm run lint:fix
```

Ou organize manualmente seguindo a ordem: Layout → Flexbox → Spacing → Sizing → Typography → Backgrounds → Borders → Effects

---

### Problema: `jsx-a11y/click-events-have-key-events` - Elemento clicável sem acessibilidade

**Solução:** Use o elemento semântico correto:

```tsx
// ❌ Incorreto
<div onClick={handleClick}>Clique</div>

// ✅ Correto - use button
<button onClick={handleClick}>Clique</button>

// ✅ Ou adicione acessibilidade
<div
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  role="button"
  tabIndex={0}
  aria-label="Ação"
>
  Clique
</div>
```

---

### Problema: `@typescript-eslint/no-explicit-any` - Uso de `any`

**Solução:** Substitua `any` por tipos mais específicos:

```typescript
// ❌ Incorreto
function process(data: any): any {
  return data.value;
}

// ✅ Use unknown para entrada
function process(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return String((data as { value: unknown }).value);
  }
  return '';
}

// ✅ Ou defina interfaces
interface Data {
  value: string;
}

function process(data: Data): string {
  return data.value;
}
```

---

### Problema: `import/no-cycle` - Dependência circular

**Solução:** Extraia os tipos compartilhados para um arquivo separado:

```typescript
// ❌ Ciclo: A.ts -> B.ts -> A.ts
// types.ts - arquivo separado
export interface SharedType {
  id: string;
}

// A.ts
import type { SharedType } from './types';
export function useA(): SharedType { /* ... */ }

// B.ts
import type { SharedType } from './types';
export function useB(): SharedType { /* ... */ }
```

---

## 📝 Configuração de Ignorados

Os seguintes arquivos e diretórios são ignorados pelo ESLint:

```javascript
ignores: [
  "node_modules/**",
  ".next/**",
  "out/**",
  "dist/**",
  "build/**",
  "*.config.js",
  "*.config.ts",
  "*.config.mjs",
  "postcss.config.js",
  "next-env.d.ts",
  "coverage/**",
  "public/**",
]
```

---

## 📚 Recursos Adicionais

- [ESLint Documentation](https://eslint.org/docs/latest/)
- [TypeScript ESLint Rules](https://typescript-eslint.io/rules/)
- [React ESLint Plugin](https://github.com/jsx-eslint/eslint-plugin-react)
- [JSX Accessibility](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)
- [Tailwind CSS ESLint](https://github.com/francoismassart/eslint-plugin-tailwindcss)
- [Security ESLint](https://github.com/eslint-community/eslint-plugin-security)

---

## 🤝 Contribuindo

Ao adicionar novas regras ou modificar a configuração:

1. Atualize este documento com a nova regra
2. Inclua exemplos de código ❌/✅
3. Explique o benefício da regra
4. Execute `npm run lint` para garantir que não há regressões

---

*Documento gerado automaticamente baseado na configuração em [`eslint.config.mjs`](eslint.config.mjs)*
