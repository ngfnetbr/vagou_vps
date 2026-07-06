# Guia de Build - Aplicativos Móveis VAGOU

Este guia explica como gerar o APK (Android) e IPA (iOS) do sistema VAGOU.

## Pré-requisitos

### Para Android (APK)
- **Node.js** 18+ instalado ([download](https://nodejs.org/))
- **Android Studio** instalado ([download](https://developer.android.com/studio))
- **Java JDK 17** (geralmente vem com Android Studio)

### Para iOS (IPA)
- **Mac** com macOS 12+
- **Xcode 14+** instalado (App Store)
- **Conta de Desenvolvedor Apple** (para publicar)

---

## Configuração Inicial

### 1. Clone o Repositório

```bash
git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
cd SEU_REPOSITORIO
```

### 2. Instale as Dependências

```bash
npm install
```

### 3. Build do Projeto Web

```bash
npm run build
```

---

## Build Android (APK)

### Passo 1: Adicionar Plataforma Android

```bash
npx cap add android
```

> Se já existe, este comando será ignorado.

### Passo 2: Sincronizar Projeto

```bash
npx cap sync android
```

> Execute este comando sempre que atualizar o código.

### Passo 3: Abrir no Android Studio

```bash
npx cap open android
```

### Passo 4: Gerar APK no Android Studio

1. Aguarde o Android Studio indexar o projeto
2. Menu: **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. Aguarde a compilação (pode levar alguns minutos)
4. Clique em **locate** na notificação para encontrar o APK

O APK estará em:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Passo 5: APK de Produção (Release)

Para gerar um APK assinado para a Play Store:

1. Menu: **Build** → **Generate Signed Bundle / APK**
2. Selecione **APK**
3. Crie ou selecione uma keystore
4. Preencha as informações de assinatura
5. Selecione **release** como build variant
6. Clique em **Create**

---

## Build iOS (IPA)

> ⚠️ Requer um Mac com Xcode instalado

### Passo 1: Adicionar Plataforma iOS

```bash
npx cap add ios
```

### Passo 2: Sincronizar Projeto

```bash
npx cap sync ios
```

### Passo 3: Abrir no Xcode

```bash
npx cap open ios
```

### Passo 4: Configurar Assinatura

1. Selecione o projeto **App** no navegador lateral
2. Aba **Signing & Capabilities**
3. Selecione seu **Team** (conta de desenvolvedor)
4. Verifique o **Bundle Identifier**

### Passo 5: Gerar Archive

1. Selecione um dispositivo real ou **Any iOS Device**
2. Menu: **Product** → **Archive**
3. Aguarde a compilação

### Passo 6: Distribuir

1. No **Organizer**, selecione o archive
2. Clique em **Distribute App**
3. Escolha o método:
   - **App Store Connect** - para publicar na App Store
   - **Ad Hoc** - para testar em dispositivos específicos
   - **Development** - para desenvolvimento

---

## Build Automático (CI/CD)

O projeto inclui um workflow do GitHub Actions que gera o APK automaticamente.

### Como Funciona

1. A cada push na branch `main`, o workflow é executado
2. O APK é gerado e disponibilizado como **Artifact**
3. Para criar uma release com APK, crie uma tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

### Baixar o APK

1. Vá em **Actions** no repositório GitHub
2. Selecione o workflow mais recente
3. Na seção **Artifacts**, baixe `app-debug`

---

## Personalização do App

### Alterar Nome do App

Edite `capacitor.config.ts`:

```typescript
const config: CapacitorConfig = {
  appId: 'com.suaprefeitura.vagou',  // ID único
  appName: 'VAGOU - Sua Cidade',      // Nome exibido
  // ...
};
```

### Alterar Ícone do App

1. Gere ícones nos tamanhos necessários:
   - Android: 48x48, 72x72, 96x96, 144x144, 192x192 (em `android/app/src/main/res/`)
   - iOS: Vários tamanhos (em `ios/App/App/Assets.xcassets/AppIcon.appiconset/`)

2. Ou use uma ferramenta como [capacitor-assets](https://github.com/ionic-team/capacitor-assets):

```bash
npx @capacitor/assets generate --android --ios
```

### Alterar Splash Screen

Similar aos ícones, substitua as imagens de splash em:
- Android: `android/app/src/main/res/drawable/`
- iOS: `ios/App/App/Assets.xcassets/Splash.imageset/`

---

## Solução de Problemas

### Erro: "SDK location not found"

Crie um arquivo `android/local.properties`:

```properties
sdk.dir=/Users/SEU_USUARIO/Library/Android/sdk
```

No Windows:
```properties
sdk.dir=C:\\Users\\SEU_USUARIO\\AppData\\Local\\Android\\Sdk
```

### Erro: "Gradle sync failed"

1. No Android Studio: **File** → **Sync Project with Gradle Files**
2. Se persistir: **File** → **Invalidate Caches / Restart**

### Erro: "No signing certificate"

Configure a assinatura no Xcode conforme o Passo 4 do Build iOS.

### App mostra tela branca

1. Verifique se executou `npm run build` antes de `npx cap sync`
2. Verifique se o `webDir` no `capacitor.config.ts` está correto (`dist`)

---

## Comandos Úteis

```bash
# Sincronizar após mudanças no código
npm run build && npx cap sync

# Abrir no Android Studio
npx cap open android

# Abrir no Xcode
npx cap open ios

# Executar no dispositivo conectado
npx cap run android
npx cap run ios

# Ver logs do app
npx cap run android --livereload
npx cap run ios --livereload
```

---

## Links Úteis

- [Documentação Capacitor](https://capacitorjs.com/docs)
- [Google Play Console](https://play.google.com/console)
- [App Store Connect](https://appstoreconnect.apple.com)
- [Gerador de Ícones](https://www.appicon.co/)
