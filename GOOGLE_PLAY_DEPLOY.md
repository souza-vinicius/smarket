# Deploy na Google Play Store - Mercado Esperto

Este guia detalha todos os passos para publicar o app Mercado Esperto na Google Play Store.

## Pré-requisitos

1. ✅ Conta Google Play Developer (U$ 25,00 - pagamento único)
2. ✅ Projeto Capacitor configurado (pronto em `apps/web/`)
3. ✅ Ícones e assets prontos
4. ✅ Backend API deployed e acessível

---

## Passo 1: Criar Conta Google Play Developer

1. Acesse [Google Play Console](https://play.google.com/console/)
2. Faça login com sua conta Google
3. Pague a taxa de registro (U$ 25,00)
4. Complete o perfil do desenvolvedor

---

## Passo 2: Configurar Signing Key

### Gerar a Keystore

```bash
cd apps/web/android/keystore
chmod +x generate-keystore.sh
./generate-keystore.sh
```

Guarde a **senha gerada** em um local seguro!

### Converter para Base64 (para CI/CD)

```bash
base64 -i mercado-esperto-release.p12 | tr -d '\n'
```

Copie o resultado - você precisará dele como secret no GitHub.

---

## Passo 3: Criar Service Account do Google Cloud

Para fazer upload automático para a Google Play Store via CI/CD, você precisa criar uma Service Account:

### 3.1 Acessar Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Selecione seu projeto (ou crie um novo)
3. Vá para **IAM e Admin > Contas de Serviço**
4. Clique em **+ CRIAR CONTA DE SERVIÇO**

### 3.2 Criar a Service Account

1. **Nome da conta de serviço**: `play-store-uploader`
2. **ID da conta de serviço**: `play-store-uploader@seu-projeto.iam.gserviceaccount.com`
3. **Descrição**: Service account para upload automatizado na Play Store
4. Clique em **CRIAR E CONTINUAR**

### 3.3 Atribuir Permissões

1. Na etapa "Conceder acesso a esta conta de serviço", adicione o papel:
   - **Editor de Apps do Google Play**
2. Clique em **CONCLUIR**

### 3.4 Gerar Chave JSON

1. Na lista de contas de serviço, clique na conta que você criou
2. Vá para a aba **CHAVES**
3. Clique em **ADICIONAR CHAVE > Criar nova chave**
4. Selecione **JSON**
5. Clique em **CRIAR**
6. O arquivo JSON será baixado automaticamente

### 3.5 Conceder Acesso na Play Console

1. Acesse [Google Play Console](https://play.google.com/console/)
2. Vá para **Configurações > Usuários e permissões**
3. Clique em **Convidar novos usuários**
4. Adicione o email da service account: `play-store-uploader@seu-projeto.iam.gserviceaccount.com`
5. Selecione as permissões:
   - **Acesso ao app** (selecione o app)
   - **Gerenciar Apps e Versões**
   - **Acesso de teste**
6. Clique em **Convidar usuário**

---

## Passo 4: Configurar Secrets no GitHub

Navegue até: `Settings > Secrets and variables > Actions`

### Secrets Obrigatórios

| Secret | Descrição | Exemplo |
|--------|-----------|---------|
| `ANDROID_SIGNING_KEY` | Keystore codificada em base64 | (saída do base64) |
| `ANDROID_KEYSTORE_PASSWORD` | Senha da keystore | `MinhaSenha123!` |
| `ANDROID_KEYSTORE_ALIAS` | Alias da chave | `mercado-esperto` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT` | JSON da conta de serviço | `{"type": "service_account", ...}` |

### Variables Obrigatórias

| Variable | Descrição | Exemplo |
|----------|-----------|---------|
| `NEXT_PUBLIC_API_URL` | URL da API em produção | `https://api.mercadoesperto.com` |

---

## Passo 4: Criar App na Google Play Console

1. Acesse [Google Play Console](https://play.google.com/console/)
2. Clique em **Criar Aplicativo**
3. Preencha:
   - **Nome do aplicativo**: Mercado Esperto
   - **Idioma padrão**: Português (Brasil)
   - **Tipo de aplicativo**: Aplicativo Android
   - **Declarar apps**: Não, é um app novo

---

## Passo 5: Configurar App Signing

### Opção A: Usar App Signing by Google Play (Recomendado)

1. No menu lateral: **Release > Setup > App signing**
2. Escolha **Export and upload a key (not using Java 8+)**
3. Faça upload da chave pública (.pem ou .der)
4. Gere uma chave de upload para signing local

### Opção B: Assinar Localmente

1. Use a keystore gerada no Passo 2
2. Configure o GitHub Actions com os secrets
3. O build assinará automaticamente

---

## Passo 6: Preencher Informações da Loja

### Presença na Loja

- **Título**: Mercado Esperto
- **Descrição curta**: Seu assistente pessoal de compras
- **Descrição completa**: (descrição detalhada do app)

### Assets

- **Ícones**: 512x512 (Google Play), múltiplas resoluções (prontos em `res/`)
- **Capturas de tela**: Mínimo 2, máximo 8
- **Ícone de recurso**: 1024x500

### Classificação de Conteúdo

- **Categoria**: Finanças
- **Declarações**: Não contém direcionamento a crianças

### Preço e Distribuição

- **Preço**: Grátis
- **Países**: Brasil

---

## Passo 7: Executar o Build

### Opção A: Via GitHub Actions

1. Vá para a aba **Actions** no GitHub
2. Selecione **Android Build & Deploy**
3. Clique em **Run workflow**
4. Configure:
   - Environment: `production`
   - Upload to Google Play: `true` (após configurar a service account)
5. Clique em **Run workflow**

### Opção B: Build Local

```bash
cd apps/web

# Configurar variáveis
export ANDROID_KEYSTORE_PASSWORD="sua_senha"
export ANDROID_KEYSTORE_ALIAS="mercado-esperto"

# Build
npm run build:mobile:prod
npx cap sync android
cd android
./gradlew assembleRelease
```

---

## Passo 8: Revisar e Publicar

1. Vá para **Release > Production**
2. Clique em **Create new release**
3. Faça upload do AAB gerado
4. Adicione notas de lançamento
5. Clique em **Review release**
6. Confirme a publicação

---

## Configuração de Variáveis de Ambiente

### Backend API URL

O app usa `NEXT_PUBLIC_API_URL` para conectar à API:

| Ambiente | URL |
|----------|-----|
| Desenvolvimento | `http://localhost:8000` |
| Produção | `https://smarket-api.n8nvinicius.cloud` |

### Atualizando a URL de Produção

1. No GitHub: Settings > Secrets and variables > Actions > Variables
2. Adicione: `NEXT_PUBLIC_API_URL` = URL da sua API em produção

---

## Estrutura de Arquivos

```
apps/web/
├── android/
│   ├── app/
│   │   └── src/main/res/     # Ícones e recursos
│   ├── keystore/
│   │   ├── README.md         # Documentação
│   │   └── generate-keystore.sh  # Script de geração
│   └── build.gradle          # Configuração de build
├── capacitor.config.ts       # Configuração Capacitor
└── package.json              # Scripts de build
```

---

## Troubleshooting

### Erro: "Keystore not found"

```bash
# Verificar se a keystore existe
ls -la apps/web/android/keystore/
```

### Erro: "Invalid keystore format"

- A keystore precisa ser gerada com `keytool`
- Use formato PKCS12 (.p12)

### Erro: "Upload failed - different signing key"

- A chave usada no build deve ser a mesma do App Signing
- Verifique se está usando a chave correta

### Erro: "API URL not accessible"

- Verifique se a API está online
- Configure CORS para permitir o app mobile

---

## Comandos Úteis

```bash
# Build local (APK debug)
cd apps/web
npm run build:mobile
npx cap sync android
cd android && ./gradlew assembleDebug

# Build local (APK release assinado)
export ANDROID_KEYSTORE_PASSWORD="senha"
export ANDROID_KEYSTORE_ALIAS="mercado-esperto"
cd android && ./gradlew assembleRelease

# Build AAB
cd android && ./gradlew bundleRelease

# Listar outputs
find apps/web/android -name "*.apk" -o -name "*.aab"
```

---

## Referências

- [Capacitor Android Documentation](https://capacitorjs.com/docs/android)
- [Google Play Console Help](https://developer.android.com/distribute/console)
- [GitHub Actions for Android](https://github.com/marketplace/actions/android-build)
- [r0adkll/upload-google-play](https://github.com/marketplace/actions/upload-google-play)