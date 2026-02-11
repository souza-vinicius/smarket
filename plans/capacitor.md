# Plano: Migrar SMarket Web para iOS/Android com Capacitor

## Contexto

O SMarket e um app Next.js 14 (App Router) 100% client-side que usa React Query + Axios para data fetching. O objetivo e empacota-lo como app nativo iOS e Android usando Capacitor, mantendo o deploy web existente (Docker/Dokploy) funcionando.

Por que Capacitor:
- Reutiliza ~95% do codigo existente
- Acesso a camera nativa (fotos de NF)
- Publicacao nas app stores
- O app ja tem UI mobile-first (bottom nav, safe areas, responsive Tailwind)

Risco principal:
- O deploy web atual usa `output: 'standalone'` (servidor Node.js)
- Capacitor precisa de `output: 'export'` (static)
- Solucao: build condicional via variavel de ambiente

---

## Fase 1: Build Estatico Condicional

Objetivo: `npm run build:mobile` gera pasta `out/` estatica; `npm run build` continua gerando standalone para Docker.

### 1.1 Condicionar output no `next.config.js`

Arquivo: `apps/web/next.config.js`

```js
output: process.env.BUILD_TARGET === 'capacitor' ? 'export' : 'standalone',
```

### 1.2 Converter root redirect para client-side com loading

Arquivo: `apps/web/src/app/page.tsx`

Problema: `redirect()` de `next/navigation` usado como server component nao funciona com static export.

Converter para:

```tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
}
```

**Nota**: O componente de loading evita um flash de conteúdo vazio antes do redirecionamento.

### 1.3 Adicionar `generateStaticParams` nas rotas dinamicas

Static export exige `generateStaticParams` em rotas com `[param]`. Retornar `[]` gera shell pages que resolvem no client.

Arquivos:
- `apps/web/src/app/invoices/[invoiceId]/page.tsx`
  - Mudanca: adicionar `generateStaticParams` + migrar de `params` prop para `useParams()`
  - **Nota**: Este é o unico arquivo que usa `params` como props e precisa migrar
- `apps/web/src/app/invoices/[invoiceId]/edit/page.tsx`
  - Mudanca: adicionar `generateStaticParams` (ja usa `useParams()`)
- `apps/web/src/app/invoices/review/[processingId]/page.tsx`
  - Mudanca: adicionar `generateStaticParams` (ja usa `useParams()`)

**Importante**: Apenas `[invoiceId]/page.tsx` precisa migrar de `params` prop para `useParams()`. Os outros dois arquivos ja usam `useParams()`.

### 1.4 Instalar cross-env para compatibilidade multi-plataforma

```bash
cd apps/web
npm install -D cross-env
```

**Importante**: `cross-env` garante que a variável de ambiente funcione corretamente no Windows, macOS e Linux.

### 1.5 Adicionar script de build mobile

Arquivo: `apps/web/package.json`

```json
"build:mobile": "cross-env BUILD_TARGET=capacitor next build"
```

### Verificacao

```bash
cd apps/web
npm run build:mobile
npx serve out/
```

Checklist:
- Testar login, dashboard, criar/ver invoice, analytics
- Confirmar que `npm run build` (sem `BUILD_TARGET`) ainda gera standalone

---

## Fase 2: Setup do Capacitor

Objetivo: instalar Capacitor, adicionar iOS/Android, rodar no simulador.

### 2.1 Instalar dependencias

```bash
cd apps/web
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
```

### 2.2 Inicializar e configurar

```bash
npx cap init "SMarket" "com.smarket.app" --web-dir out
```

Arquivo criado: `apps/web/capacitor.config.ts`

```ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smarket.app',
  appName: 'SMarket',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#f6f8f7',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
```

### 2.3 Adicionar plataformas

```bash
npx cap add ios
npx cap add android
```

### 2.4 Primeiro build + sync

```bash
npm run build:mobile && npx cap sync
npx cap open ios
npx cap open android
```

### 2.5 Atualizar `.gitignore`

Arquivo: `.gitignore`

Adicionar:

```gitignore
apps/web/out/
```

Manter `ios/` e `android/` no git (contem configs nativas customizadas).

### Verificacao

- App abre no simulador iOS e Android
- Tela de login aparece
- Navegacao basica funciona

---

## Fase 3: Plugins Nativos

Objetivo: camera para fotos de NF, StatusBar, back button Android.

### 3.1 Instalar plugins

```bash
cd apps/web
npm install @capacitor/camera @capacitor/status-bar @capacitor/splash-screen @capacitor/keyboard @capacitor/app
npx cap sync
```

### 3.2 Criar helper de plataforma

Novo arquivo: `apps/web/src/lib/capacitor.ts`

```ts
import { Capacitor } from '@capacitor/core';

export const isNative = () => Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform();
```

### 3.3 Inicializar plugins no providers

Arquivo: `apps/web/src/app/providers.tsx`

Adicionar hook `useNativeInit()` com dynamic imports:
- `StatusBar`: estilo dark, overlay true
- `SplashScreen`: hide apos mount
- `App`: listener do back button Android (`window.history.back()` ou `exitApp()`)

Todos imports via `await import(...)` para nao quebrar na web.

### 3.4 Integrar camera nativa no upload

Arquivo: `apps/web/src/components/invoices/upload-modal.tsx`

Adicionar botao "Tirar Foto" (visivel apenas em `isNative()`):
- Usa `Camera.getPhoto()` com `resultType: DataUrl`, `width: 1536`
- Converte `DataUrl` para `File` e adiciona ao array de imagens existente
- Fallback: input file existente continua funcionando

### 3.5 Permissoes nativas e fluxo de solicitacao

iOS (`apps/web/ios/App/App/Info.plist`):
- `NSCameraUsageDescription`: "SMarket precisa da camera para fotografar notas fiscais"
- `NSPhotoLibraryUsageDescription`: "SMarket precisa acessar fotos de notas fiscais"

Android (`apps/web/android/app/src/main/AndroidManifest.xml`):
- `android.permission.CAMERA`

### 3.6 Implementar fluxo de permissoes com tratamento de negacao

Novo arquivo: `apps/web/src/lib/camera-permissions.ts`

```ts
import { Camera, CameraPermissionState } from '@capacitor/camera';

export async function requestCameraPermission(): Promise<boolean> {
  const status = await Camera.checkPermissions();

  if (status.camera === 'granted') {
    return true;
  }

  if (status.camera === 'denied') {
    // Usuario negou a permissao anteriormente
    // Mostrar modal explicando por que a permissao e necessaria
    // Redirecionar para configuracoes do app
    return false;
  }

  if (status.camera === 'prompt') {
    // Solicitar permissao ao usuario
    const result = await Camera.requestPermissions();
    return result.camera === 'granted';
  }

  return false;
}

export async function openAppSettings(): Promise<void> {
  const { App } = await import('@capacitor/app');
  await App.openUrl('app-settings:');
}
```

### 3.7 Integrar fluxo de permissoes no upload modal

Arquivo: `apps/web/src/components/invoices/upload-modal.tsx`

Adicionar tratamento de permissões ao clicar no botão "Tirar Foto":

```tsx
const handleTakePhoto = async () => {
  const hasPermission = await requestCameraPermission();

  if (!hasPermission) {
    setShowPermissionModal(true);
    return;
  }

  // Continuar com captura da foto
};
```

### Verificacao

- Botao "Tirar Foto" aparece no simulador, nao na web
- Camera abre, foto aparece no preview, upload funciona
- Back button Android navega corretamente
- StatusBar estilizada

---

## Fase 4: Safe Areas e Layout Nativo

Objetivo: header, modais e content respeitam notch/Dynamic Island.

### 4.1 Adicionar `pt-safe` ao header

Arquivo: `apps/web/src/components/layout/header.tsx`

Adicionar classe `pt-safe` no `<header>`:

```tsx
<header
  className={cn(
    "sticky top-0 z-30 pt-safe", // Adicionar pt-safe aqui
    "bg-background/95 backdrop-blur-lg",
    "border-b border-border"
  )}
>
```

As utilities CSS ja existem em `globals.css` (linhas 207-209).

### 4.2 Verificar mobile-nav

Arquivo: `apps/web/src/components/layout/mobile-nav.tsx`

Ja usa `pb-safe` (OK).

### 4.3 Verificar modais

Arquivo: `apps/web/src/components/ui/modal.tsx`

Garantir padding adequado no bottom de drawers para home indicator iOS.

### Verificacao

- Header nao fica atras do notch no iPhone 15 Pro
- Bottom nav nao fica atras da home indicator
- Testar em iPhone SE (sem notch) e Pixel 7

---

## Fase 5: Icones e Splash Screen

Objetivo: app icons e splash screens para iOS e Android.

### 5.1 Criar assets base

- `apps/web/resources/icon.png` (1024x1024, fundo `#13ec80`, logo branco)
- `apps/web/resources/splash.png` (2732x2732, fundo `#f6f8f7`, logo centralizado)

### 5.2 Gerar todos os tamanhos

```bash
npm install -D @capacitor/assets
npx capacitor-assets generate
```

### 5.3 Icones PWA web

Gerar e salvar em `apps/web/public/`:
- `icon-192x192.png`
- `icon-512x512.png`
- `apple-touch-icon.png`
- `favicon.ico`

---

## Fase 6: Rede e CORS

Objetivo: app nativo se conecta ao backend.

### 6.1 API URL em build time

`NEXT_PUBLIC_API_URL` é resolvido em **build time** (quando rodamos `npm run build:mobile`), pois o Capacitor usa exportação estática (`output: export`).

Existem duas formas de configurar:

#### Opção A: Arquivo `.env.production` (Recomendado)

Crie o arquivo `apps/web/.env.production`:

```env
NEXT_PUBLIC_API_URL=https://api.smarket.com.br
```

Ao rodar o build, o Next.js pegará automaticamente esta variável.

#### Opção B: Via linha de comando

```bash
NEXT_PUBLIC_API_URL=https://api.smarket.com.br npm run build:mobile
```

> **Nota para Desenvolvimento Local**:
> Se você estiver rodando o backend localmente e testando no dispositivo físico ou emulador, **NÃO use `localhost`**, pois `localhost` refere-se ao próprio dispositivo (celular).
>
> Use o IP da sua máquina na rede local:
> ```bash
> # Exemplo (verifique seu IP com ifconfig/ipconfig)
> NEXT_PUBLIC_API_URL=http://192.168.1.15:8000 npm run build:mobile
> ```
>
> Certifique-se também que seu backend está rodando em `0.0.0.0` e não apenas em `127.0.0.1` para aceitar conexões externas.

### 6.2 Adicionar origins do Capacitor ao CORS

Arquivo: `apps/api/src/config.py` (ou `.env`)

`ALLOWED_ORIGINS` (default: `http://localhost:3000`) precisa incluir:
- `capacitor://localhost` (iOS)
- `https://localhost` (Android)

Exemplo no `.env`:

```env
ALLOWED_ORIGINS=http://localhost:3000,capacitor://localhost,https://localhost
```

### Verificacao

- Login funciona no app nativo
- Upload de fotos funciona
- Nenhum erro de CORS no console

---

## Fase 7: Scripts e Workflow de Dev

Arquivo: `apps/web/package.json` (scripts finais):

```json
"build:mobile": "cross-env BUILD_TARGET=capacitor next build && npx cap sync",
"cap:ios": "npx cap open ios",
"cap:android": "npx cap open android",
"cap:sync": "npx cap sync",
"cap:run:ios": "npx cap run ios",
"cap:run:android": "npx cap run android",
"test:e2e:ios": "detox test --configuration ios.sim.debug",
"test:e2e:android": "detox test --configuration android.emu.debug"
```

---

## Fase 8: Plugins Adicionais (Opcionais)

Objetivo: adicionar funcionalidades avancadas ao app nativo.

### 8.1 Atualizacoes Automaticas

```bash
npm install @capacitor/app-update
npx cap sync
```

Configurar em `capacitor.config.ts`:

```ts
plugins: {
  AppUpdate: {
    updateUrl: 'https://api.smarket.com.br/app-update',
    autoUpdate: true,
  },
}
```

### 8.2 Notificacoes Push

```bash
npm install @capacitor/push-notifications
npx cap sync
```

### 8.3 Deep Linking

Configurar em `capacitor.config.ts`:

```ts
server: {
  androidScheme: 'https',
  allowNavigation: ['*'],
},
plugins: {
  App: {
    urlScheme: 'smarket',
  },
}
```

### 8.4 Analytics Nativo

```bash
npm install @capacitor-firebase/analytics
npx cap sync
```

### 8.5 Status de Rede

```bash
npm install @capacitor/network
npx cap sync
```

### 8.6 Armazenamento Local

```bash
npm install @capacitor/preferences
npx cap sync
```

---

## Fase 9: Testes E2E

Objetivo: garantir que o app nativo funcione corretamente em simuladores e dispositivos reais.

### 9.1 Instalar Detox (framework de testes E2E para React Native)

```bash
cd apps/web
npm install -D detox detox-cli
npx detox init
```

### 9.2 Configurar Detox

Arquivo: `apps/web/package.json`

```json
"detox": {
  "test-runner": "jest",
  "runner-config": "e2e/config.json",
  "specs": "e2e",
  "configurations": {
    "ios.sim.debug": {
      "binaryPath": "ios/build/Build/Products/Debug-iphonesimulator/SMarket.app",
      "build": "xcodebuild -workspace ios/SMarket.xcworkspace -scheme SMarket -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build",
      "type": "ios.app",
      "device": {
        "type": "iPhone 15 Pro"
      }
    },
    "android.emu.debug": {
      "binaryPath": "android/app/build/outputs/apk/debug/app-debug.apk",
      "build": "cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug && cd ..",
      "type": "android.apk",
      "device": {
        "avdName": "Pixel_7_API_34"
      }
    }
  }
}
```

### 9.3 Criar testes básicos

Arquivo: `apps/web/e2e/basic-flow.e2e.ts`

```ts
describe('Basic Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should display login screen', async () => {
    await expect(element(by.id('login-screen'))).toBeVisible();
  });

  it('should login successfully', async () => {
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('login-button')).tap();
    await expect(element(by.id('dashboard-screen'))).toBeVisible();
  });

  it('should upload photo from camera', async () => {
    await element(by.id('add-invoice-button')).tap();
    await element(by.id('camera-button')).tap();
    // Simular captura de foto
    await element(by.id('capture-button')).tap();
    await expect(element(by.id('photo-preview'))).toBeVisible();
  });
});
```

### 9.4 Executar testes

```bash
# iOS
npm run test:e2e:ios

# Android
npm run test:e2e:android
```

### Verificacao

- Testes passam no simulador iOS
- Testes passam no emulador Android
- Testes passam em dispositivos reais (opcional)

---

## Fase 10: Deploy nas App Stores

Objetivo: publicar o app na Apple App Store e Google Play Store.

### 10.1 iOS - Apple App Store

#### 10.1.1 Configurar certificados e provisioning profiles

1. Acessar [Apple Developer](https://developer.apple.com)
2. Criar App ID: `com.smarket.app`
3. Criar Distribution Certificate
4. Criar Provisioning Profile (App Store)

#### 10.1.2 Build para produção

```bash
cd apps/web
npm run build:mobile
npx cap sync ios
npx cap open ios
```

No Xcode:
1. Selecionar scheme "SMarket"
2. Selecionar "Any iOS Device (arm64)"
3. Product > Archive
4. Após o build, clicar em "Distribute App"
5. Selecionar "App Store Connect"
6. Upload

#### 10.1.3 Configurar no App Store Connect

1. Criar novo app no App Store Connect
2. Preencher informações básicas (nome, descricao, screenshots)
3. Definir preco e disponibilidade
4. Submeter para revisao

### 10.2 Android - Google Play Store

#### 10.2.1 Gerar keystore de assinatura

```bash
keytool -genkey -v -keystore smarket-release.keystore -alias smarket -keyalg RSA -keysize 2048 -validity 10000
```

Salvar o keystore em local seguro (NÃO commitar no git).

#### 10.2.2 Configurar signing no build.gradle

Arquivo: `apps/web/android/app/build.gradle`

```gradle
android {
    signingConfigs {
        release {
            storeFile file('../../smarket-release.keystore')
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

#### 10.2.3 Build para produção

```bash
cd apps/web
npm run build:mobile
npx cap sync android
cd android
./gradlew assembleRelease
```

O APK será gerado em: `android/app/build/outputs/apk/release/app-release.apk`

#### 10.2.4 Upload no Google Play Console

1. Criar novo app no Google Play Console
2. Configurar informacoes do app (nome, descricao, screenshots)
3. Fazer upload do APK ou AAB (Android App Bundle)
4. Definir preco e disponibilidade
5. Submeter para revisao

### 10.3 Variaveis de ambiente para CI/CD

Adicionar ao `.env.example`:

```env
# iOS Signing (para CI/CD)
# IOS_CERTIFICATE_PATH=path/to/certificate.p12
# IOS_CERTIFICATE_PASSWORD=your-password
# IOS_PROVISIONING_PROFILE_SPECIFIER=com.smarket.app

# Android Signing (para CI/CD)
# KEYSTORE_PASSWORD=your-keystore-password
# KEY_ALIAS=smarket
# KEY_PASSWORD=your-key-password
```

---

## 11. Troubleshooting

### 11.1 Erro SSL no Android (net_error -202)

**Erro**: `[ERROR:ssl_client_socket_impl.cc(992)] handshake failed; returned -1, SSL error code 1, net_error -202`

**Causa**: O app está tentando conectar via HTTPS a um servidor com certificado inválido ou auto-assinado (comum em localhost), ou você configurou `https://` para um IP local que só aceita HTTP.

**Solução**:
1.  Garanta que o `android:usesCleartextTraffic="true"` esteja no `AndroidManifest.xml` (já incluído neste plano).
2.  Use `http://` (não `https://`) para o backend local.
    Ex: `NEXT_PUBLIC_API_URL=http://192.168.1.15:8000 npm run build:mobile`

---

## Resumo de Arquivos

### Modificar

| Arquivo | Mudanca |
| --- | --- |
| `apps/web/next.config.js` | Output condicional (`standalone/export`) |
| `apps/web/package.json` | Dependencias Capacitor + cross-env + scripts |
| `apps/web/src/app/page.tsx` | Server redirect -> client redirect com loading |
| `apps/web/src/app/invoices/[invoiceId]/page.tsx` | `generateStaticParams` + `useParams()` |
| `apps/web/src/app/invoices/[invoiceId]/edit/page.tsx` | `generateStaticParams` |
| `apps/web/src/app/invoices/review/[processingId]/page.tsx` | `generateStaticParams` |
| `apps/web/src/app/providers.tsx` | Init plugins nativos |
| `apps/web/src/components/invoices/upload-modal.tsx` | Botao camera nativa + fluxo de permissoes |
| `apps/web/src/components/layout/header.tsx` | `pt-safe` |
| `.gitignore` | `apps/web/out/` |

### Criar

| Arquivo | Proposito |
| --- | --- |
| `apps/web/capacitor.config.ts` | Config Capacitor |
| `apps/web/src/lib/capacitor.ts` | Helpers de plataforma |
| `apps/web/src/lib/camera-permissions.ts` | Fluxo de permissoes da camera |
| `apps/web/resources/icon.png` | Icone base 1024x1024 |
| `apps/web/resources/splash.png` | Splash base 2732x2732 |
| `apps/web/e2e/basic-flow.e2e.ts` | Testes E2E basicos |
| `apps/web/e2e/config.json` | Configuracao do Detox |
| `plans/CAPACITOR.md` | Copia deste plano no repo |

### Gerados automaticamente

| Pasta | Por |
| --- | --- |
| `apps/web/ios/` | `npx cap add ios` |
| `apps/web/android/` | `npx cap add android` |
| `apps/web/out/` | `next build` com export |

---

## Verificacao Final E2E

1. `npm run build` - standalone funciona (deploy web nao quebrou)
2. `npm run build:mobile` - gera `out/` com static export
3. `npx cap sync && npx cap run ios` - app abre no simulador
4. Login -> Dashboard -> Upload foto (camera nativa) -> Review -> Confirm
5. Analytics, Products e Insights funcionam
6. Back button Android funciona
7. Safe areas corretas em iPhone 15 Pro e Pixel 7
8. Permissoes de camera funcionam corretamente (concessao e negacao)
9. Testes E2E passam em iOS e Android

---

## Notas Importantes

### Compatibilidade Multi-plataforma
- `cross-env` garante que variaveis de ambiente funcionem no Windows, macOS e Linux
- Scripts de build sao independentes do sistema operacional

### Permissoes Nativas
- iOS requer descricao detalhada no `Info.plist`
- Android requer declaracao no `AndroidManifest.xml`
- Implementar fluxo de tratamento de negacao de permissoes

### Safe Areas
- Classes `pt-safe`, `pb-safe`, `px-safe` ja existem no `globals.css`
- Header precisa de `pt-safe` para evitar sobreposicao com notch
- Mobile nav ja tem `pb-safe` (OK)

### Testes
- Detox e recomendado para testes E2E em iOS e Android
- Testes devem cobrir fluxos criticos (login, upload, navegacao)
- Testar em dispositivos reais e simuladores

### Deploy
- iOS requer certificados e provisioning profiles da Apple
- Android requer keystore de assinatura
- Ambos requerem conta de desenvolvedor paga
- Processo de revisao pode levar varios dias
