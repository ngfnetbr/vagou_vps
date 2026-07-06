# ⚠️ ARQUIVO OBSOLETO

> **ATENÇÃO:** Este guia foi substituído por uma versão mais moderna e compatível com Windows.
>
> Por favor, consulte: **[GUIA_MULTI_INSTANCIA.md](GUIA_MULTI_INSTANCIA.md)**

---

# VAGOU - Guia de Deploy para Nova Cidade

Este documento detalha o processo completo para configurar o sistema VAGOU em uma nova cidade, incluindo a criação do projeto Supabase, aplicação do schema, configuração de storage, deploy de Edge Functions e publicação na Vercel.

---

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter:

- [ ] Conta no [Supabase](https://supabase.com)
- [ ] Conta na [Vercel](https://vercel.com) (ou outro host)
- [ ] [Node.js](https://nodejs.org) instalado (v18+)
- [ ] [Supabase CLI](https://supabase.com/docs/guides/cli) instalado (`npm install -g supabase`)
- [ ] [Git](https://git-scm.com) instalado
- [ ] Acesso ao repositório do VAGOU

---

## 🚀 Processo de Deploy

### Opção A: Script Automatizado (Recomendado)

Execute o script interativo que guia todo o processo:

```bash
chmod +x scripts/deploy/deploy-cidade.sh
./scripts/deploy/deploy-cidade.sh
```

### Opção B: Processo Manual

Siga os passos abaixo caso prefira executar manualmente.

---

## 📝 Checklist Completo

### 1. Criar Projeto no Supabase

- [ ] Acesse [supabase.com/dashboard](https://supabase.com/dashboard)
- [ ] Clique em "New Project"
- [ ] Preencha:
  - **Name**: `vagou-[nome-da-cidade]` (ex: `vagou-saopaulo`)
  - **Database Password**: Crie uma senha forte e guarde-a
  - **Region**: Escolha a mais próxima (ex: South America - São Paulo)
- [ ] Aguarde a criação do projeto (pode levar alguns minutos)

### 2. Coletar Credenciais

Após a criação, vá em **Project Settings → API** e anote:

| Informação | Onde Encontrar | Valor |
|------------|----------------|-------|
| Project Reference | URL do projeto | `____________` |
| Project URL | API Settings | `https://xxx.supabase.co` |
| Anon Key | API Keys | `____________` |
| Service Role Key | API Keys | `____________` |

Vá em **Project Settings → Database** e anote:

| Informação | Onde Encontrar | Valor |
|------------|----------------|-------|
| Connection String (URI) | Connection string | `postgresql://...` |

### 3. Linkar Projeto Local

```bash
# No diretório do projeto VAGOU
cd vagou

# Fazer login no Supabase (se ainda não fez)
supabase login

# Linkar ao novo projeto
supabase link --project-ref SEU_PROJECT_REF
```

### 4. Aplicar Migrations (Schema do Banco)

```bash
# Aplicar todas as migrations ao banco
supabase db push
```

**Verificação**: Acesse o SQL Editor no Supabase Dashboard e execute:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;
```

Você deve ver tabelas como: `auditoria`, `campos_inscricao`, `cmeis`, `configuracoes_sistema`, `criancas`, etc.

### 5. Configurar Storage (Buckets)

No SQL Editor do Supabase, execute o conteúdo do arquivo `scripts/setup/sql/02-setup-storage.sql`.

**Verificação**: Vá em **Storage** no dashboard e confirme que os buckets existem:
- [ ] `brasoes` (público)
- [ ] `avatars` (público)
- [ ] `assets` (público)
- [ ] `documentos` (privado)

### 6. Inserir Dados Iniciais da Cidade

1. Abra o arquivo `scripts/setup-dados-iniciais.sql`
2. Substitua os placeholders `{{...}}` pelos dados reais da cidade:

| Placeholder | Descrição | Exemplo |
|-------------|-----------|---------|
| `{{NOME_MUNICIPIO}}` | Nome da cidade | `São Paulo` |
| `{{NOME_SECRETARIA}}` | Nome da secretaria | `Secretaria Municipal de Educação` |
| `{{EMAIL_CONTATO}}` | Email de contato | `educacao@saopaulo.sp.gov.br` |
| `{{TELEFONE_CONTATO}}` | Telefone | `(11) 3333-4444` |
| `{{ENDERECO_SECRETARIA}}` | Endereço | `Rua Borges, 123 - Centro` |

3. Execute o SQL no SQL Editor do Supabase

### 7. Configurar Secrets das Edge Functions

Vá em **Project Settings → Edge Functions → Secrets** e adicione:

| Secret Name | Descrição | Obrigatório |
|-------------|-----------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key do projeto | ✅ Sim |
| `RESEND_API_KEY` | Chave API da Resend (para emails) | ⚠️ Se usar email |
| `WEBHOOK_WHATSAPP_SECRET` | Secret do webhook WhatsApp | ⚠️ Se usar WhatsApp |

### 8. Deploy das Edge Functions

```bash
# Deploy de todas as funções
supabase functions deploy
```

**Verificação**: Vá em **Edge Functions** no dashboard e confirme que todas as funções estão ativas:
- [ ] `admin-usuarios`
- [ ] `enviar-contato`
- [ ] `enviar-notificacao`
- [ ] `gerar-comprovante`
- [ ] `gerar-dados-ficticios`
- [ ] `gerar-ficha-pdf`
- [ ] `manifest-pwa`
- [ ] `recalcular-fila`
- [ ] `registrar-auditoria`
- [ ] `validar-captcha`
- [ ] `verificar-prazos`

### 9. Configurar Autenticação

Vá em **Authentication → Providers**:

- [ ] **Email**: Habilitar
  - Confirm email: Desabilitar (ou configurar SMTP)
  - Secure email change: Habilitar

- [ ] **Google** (opcional):
  - Configurar OAuth credentials no Google Cloud Console
  - Adicionar Client ID e Client Secret

Vá em **Authentication → URL Configuration**:

- [ ] **Site URL**: `https://seu-dominio.vercel.app`
- [ ] **Redirect URLs**: Adicionar:
  - `https://seu-dominio.vercel.app/**`
  - `http://localhost:8080/**` (para desenvolvimento)

### 10. Deploy na Vercel

#### Opção A: Via Dashboard Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Clique em "New Project"
3. Importe o repositório do VAGOU
4. Configure as variáveis de ambiente:

| Variável | Valor |
|----------|-------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon Key do Supabase |

5. Deploy!

#### Opção B: Via CLI Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### 11. Criar Primeiro Usuário Administrador

1. Acesse o sistema pelo domínio da Vercel
2. Clique em "Criar Conta"
3. Crie uma conta com email e senha
4. No Supabase Dashboard, vá em **SQL Editor** e execute:

```sql
-- Substitua 'email@admin.com' pelo email do administrador
UPDATE public.user_roles 
SET role = 'superadmin' 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'email@admin.com'
);

-- Também atualize o profile
UPDATE public.profiles 
SET role = 'superadmin' 
WHERE email = 'email@admin.com';
```

### 12. Verificação Final

- [ ] Acessar área pública do sistema
- [ ] Fazer login como admin
- [ ] Verificar dashboard administrativo
- [ ] Testar cadastro de CMEI
- [ ] Testar cadastro de turma
- [ ] Testar inscrição pública
- [ ] Verificar logs e auditoria

---

## 🔧 Troubleshooting

### Erro: "relation does not exist"

As migrations não foram aplicadas corretamente. Execute:
```bash
supabase db push --debug
```

### Erro: "permission denied"

Verifique se as RLS policies foram criadas. Execute o script SQL de setup novamente.

### Edge Functions não funcionam

1. Verifique se os secrets foram configurados
2. Veja os logs em **Edge Functions → Logs**
3. Teste localmente: `supabase functions serve`

### Storage não funciona

Verifique se as policies de storage foram criadas executando:
```sql
SELECT * FROM storage.policies WHERE bucket_id IN ('brasoes', 'avatars', 'assets', 'documentos');
```

---

## 📁 Arquivos de Referência

| Arquivo | Descrição |
|---------|-----------|
| `scripts/deploy/deploy-cidade.sh` | Script automatizado de deploy |
| `scripts/setup/sql/02-setup-storage.sql` | Criação de buckets e policies |
| `scripts/setup-dados-iniciais.sql` | Dados iniciais da cidade |
| `scripts/tools/export-schema.sh` | Exportar schema atual |
| `supabase/config.template.toml` | Template de configuração |

---

## 📞 Suporte

Em caso de dúvidas ou problemas:

1. Consulte a documentação do [Supabase](https://supabase.com/docs)
2. Consulte a documentação da [Vercel](https://vercel.com/docs)
3. Abra uma issue no repositório do projeto

---

*Última atualização: Dezembro 2024*
