# Guia de Setup Completo - VAGOU (Novo Projeto Supabase)

Este guia detalha o processo completo para configurar o sistema VAGOU em um novo projeto Supabase.

## Pré-requisitos

- [ ] Conta no Supabase (https://supabase.com)
- [ ] Node.js 18+ instalado
- [ ] Git instalado
- [ ] Acesso ao repositório do VAGOU

---

## Passo 1: Criar Projeto no Supabase

1. Acesse https://supabase.com/dashboard
2. Clique em **New Project**
3. Preencha:
   - **Name**: `vagou-[nome-cidade]`
   - **Database Password**: Anote em local seguro!
   - **Region**: South America (São Paulo) - recomendado
4. Aguarde a criação (~2 minutos)

---

## Passo 2: Obter Credenciais

No dashboard do Supabase, vá em **Settings > API** e anote:

| Variável | Onde encontrar |
|----------|----------------|
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_ANON_KEY` | `anon` public key |
| `VITE_SUPABASE_PROJECT_ID` | Parte da URL: `https://[PROJECT_ID].supabase.co` |

---

## Passo 3: Configurar Variáveis de Ambiente

1. Copie o arquivo de exemplo:
```bash
cp .env.example .env
```

2. Edite o `.env` com suas credenciais:
```env
VITE_SUPABASE_URL=https://[SEU-PROJECT-ID].supabase.co
VITE_SUPABASE_ANON_KEY=[SUA-ANON-KEY]
VITE_SUPABASE_PROJECT_ID=[SEU-PROJECT-ID]
```

---

## Passo 4: Habilitar Extensões (ANTES dos scripts)

⚠️ **IMPORTANTE**: Habilite as extensões ANTES de executar os scripts SQL!

No Supabase, vá em **Database > Extensions** e habilite:

| Extensão | Obrigatória | Função |
|----------|-------------|--------|
| `uuid-ossp` | ✅ Sim | Geração de UUIDs |
| `pg_cron` | ✅ Sim | Agendamento de tarefas (prazos, limpeza) |
| `pg_net` | ✅ Sim | Requisições HTTP dos cron jobs |

### Como habilitar:
1. Acesse **Database > Extensions**
2. Pesquise pelo nome da extensão
3. Clique em **Enable**

---

## Passo 5: Executar Scripts SQL (ORDEM IMPORTANTE)

### 5.1 Estrutura do Banco (01)

1. No Supabase, vá em **SQL Editor**
2. Clique em **New Query**
3. Cole o conteúdo completo de `scripts/setup/sql/01-setup-estrutura.sql`
4. Clique em **Run**

**Tempo estimado**: ~30 segundos

**Verificação**: Ao final, você verá as mensagens de criação das tabelas sem erros.

### 5.2 Storage Buckets (02)

1. Crie nova query no SQL Editor
2. Cole o conteúdo de `scripts/setup/sql/02-setup-storage.sql`
3. Execute

**Verificação**: Vá em **Storage** e verifique se existem os buckets:
- `brasoes` (público)
- `avatars` (público)
- `assets` (público)
- `documentos` (privado)

### 5.3 Dados Iniciais (03)

1. Crie nova query no SQL Editor
2. Cole o conteúdo de `scripts/setup/sql/03-setup-dados-iniciais.sql`
3. Execute

**Verificação**: Vá em **Table Editor** e verifique:
- `configuracoes_sistema`: 1 registro
- `turmas_base`: 4 registros
- `documentos_tipos`: 6 registros
- `tipos_prioridade`: 4 registros
- `motivos_padrao`: ~10 registros
- `templates_mensagens`: ~19 registros
- `permissoes`: ~28 registros

### 5.4 Automação e Realtime (04)

1. Cole o conteúdo de `scripts/setup/sql/04-setup-automacao.sql`
2. Execute

**Este script configura:**
- Verificação das extensões pg_cron e pg_net
- Configuração de Realtime para tabelas críticas
- Instruções para criar os cron jobs

### 5.5 Configurar Cron Jobs (04 - Parte 2)

⚠️ **Execute APÓS confirmar que pg_cron e pg_net estão habilitados**

No SQL Editor, execute (substituindo os valores):

```sql
-- Substitua SEU_PROJECT_REF pelo ID do projeto (ex: dizziofoxptanrqgxoue)
-- Substitua SUA_ANON_KEY pela chave anon/public

-- 1. Verificar prazos diariamente às 06:00 UTC (03:00 BRT)
SELECT cron.schedule(
  'verificar-prazos-diario',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://SEU_PROJECT_REF.supabase.co/functions/v1/verificar-prazos',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer SUA_ANON_KEY"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  ) AS request_id;
  $$
);

-- 2. Limpar rate limits a cada hora
SELECT cron.schedule(
  'limpar-rate-limits-hora',
  '0 * * * *',
  $$
  SELECT public.cleanup_old_rate_limits();
  $$
);

-- Verificar jobs criados
SELECT * FROM cron.job;
```

**Verificação**: Execute `SELECT * FROM cron.job;` e verifique se os jobs foram criados.

### 5.6 Criar Super Admin (05)

1. **Primeiro**, cadastre uma conta pelo sistema (faça o registro normal)
2. Cole o conteúdo de `scripts/setup/sql/05-setup-superadmin.sql`
3. **Edite** a linha com o email:
   ```sql
   v_email text := 'admin@exemplo.com'; -- [SUBSTITUIR] pelo seu email
   ```
4. Execute

**Verificação**: Vá em **Table Editor > user_roles** e confirme que existe um registro com role `superadmin`.

---

## Passo 6: Configurar Autenticação

### 6.1 Habilitar Provedores

No Supabase, vá em **Authentication > Providers**:

1. **Email**: Já habilitado por padrão
   - Desabilitar "Confirm email" para testes mais rápidos (opcional)
   - Configurar "Secure email change" conforme necessidade

2. **Google** (Recomendado):
   - Acesse https://console.cloud.google.com
   - Crie um projeto ou selecione existente
   - Vá em **APIs & Services > Credentials**
   - Crie um **OAuth 2.0 Client ID** (Web application)
   - Configure os **Authorized redirect URIs**:
     ```
     https://[SEU-PROJECT-ID].supabase.co/auth/v1/callback
     ```
   - Copie **Client ID** e **Client Secret**
   - No Supabase, habilite Google e cole as credenciais

### 6.2 Configurar URL de Redirecionamento

Em **Authentication > URL Configuration**:

| Campo | Valor |
|-------|-------|
| **Site URL** | `https://seu-dominio.com` (ou `http://localhost:5173` para dev) |
| **Redirect URLs** | Adicione todas as URLs do projeto |

**Exemplo de Redirect URLs:**
```
http://localhost:5173
http://localhost:5173/**
https://seu-projeto.lovable.app
https://seu-projeto.lovable.app/**
https://seu-dominio.com
https://seu-dominio.com/**
```

### 6.3 Configurar Templates de Email (Opcional)

Em **Authentication > Email Templates**, personalize os templates:
- Confirm signup
- Reset password
- Magic link

---

## Passo 7: Configurar Secrets das Edge Functions

No Supabase, vá em **Settings > Edge Functions > Secrets**:

### Secrets Obrigatórios

| Secret | Descrição | Como obter |
|--------|-----------|------------|
| `RESEND_API_KEY` | API key do Resend para envio de e-mails | https://resend.com/api-keys |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key do projeto | Settings > API > service_role key |

### Secrets Opcionais

| Secret | Descrição | Quando usar |
|--------|-----------|-------------|
| `WEBHOOK_WHATSAPP_SECRET` | Secret para validar webhooks | Se usar integração WhatsApp |
| `GOOGLE_MAPS_API_KEY` | API key do Google Maps | Se usar seleção de CMEIs no mapa |

### Como adicionar um Secret:

1. Vá em **Settings > Edge Functions > Secrets**
2. Clique em **Add secret**
3. Preencha o nome e valor
4. Clique em **Save**

---

## Passo 8: Verificar Edge Functions

As Edge Functions são deployadas automaticamente pelo Lovable. Verifique em **Edge Functions** se todas estão listadas:

| Função | Descrição |
|--------|-----------|
| `admin-usuarios` | Gestão de usuários (admin) |
| `enviar-contato` | Formulário de contato |
| `enviar-notificacao` | Envio de notificações |
| `gerar-comprovante` | Geração de comprovantes PDF |
| `gerar-dados-ficticios` | Dados de teste (modo demo) |
| `gerar-ficha-pdf` | Ficha de matrícula PDF |
| `get-maps-key` | Retorna API key do Maps |
| `limpar-dados` | Limpeza de dados (modo demo) |
| `manifest-pwa` | Manifest dinâmico do PWA |
| `recalcular-fila` | Recálculo de posições |
| `registrar-auditoria` | Registro de auditoria |
| `send-email` | Envio de e-mails via Resend |
| `setup-projeto` | Setup automatizado |
| `validar-captcha` | Validação hCaptcha |
| `verificar-prazos` | Verificação de prazos |

---

## Passo 9: Personalizar Configurações (Via Interface)

Após criar o superadmin, acesse o sistema e vá em **Configurações**:

### Aba Geral
- [ ] Nome do Município
- [ ] Nome da Secretaria
- [ ] E-mail de contato
- [ ] Telefone de contato
- [ ] Endereço da Secretaria
- [ ] Upload do Brasão Municipal

### Aba Inscrições
- [ ] Data de início das inscrições
- [ ] Data de fim das inscrições
- [ ] Prazo de resposta (dias)
- [ ] Limite de inscrições por responsável
- [ ] Data de corte (dia/mês)

### Aba Tema
- [ ] Cor primária
- [ ] Cor secundária
- [ ] Fonte do sistema
- [ ] Tema padrão (claro/escuro)
- [ ] Permitir troca de tema

### Aba Notificações
- [ ] Habilitar E-mail
- [ ] Habilitar SMS (se disponível)
- [ ] Habilitar WhatsApp (se disponível)
- [ ] URL do Webhook

### Aba Segurança
- [ ] Exigir autenticação para inscrição pública
- [ ] Habilitar CAPTCHA
- [ ] Configurar chaves do hCaptcha (se habilitado)

---

## Passo 10: Deploy da Aplicação

### Via Lovable

1. Conecte o projeto ao Supabase no painel do Lovable
2. Configure as variáveis de ambiente
3. Faça deploy

### Via Vercel/Netlify

1. Configure as variáveis de ambiente:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

2. Configure o build:
```
Build Command: npm run build
Output Directory: dist
```

---

## Passo 11: Validação Completa

Execute o script de validação para verificar se TUDO foi configurado corretamente:

1. No SQL Editor, cole o conteúdo de `scripts/setup/sql/99-validar-setup.sql`
2. Execute
3. Verifique os resultados

### Resultados Esperados:
- 🟢 **SUCESSO**: Setup completo
- 🟡 **PARCIAL**: Funcional, mas com avisos
- 🔴 **FALHOU**: Corrija os erros listados

---

## Checklist Final Completo

### ✅ Obrigatório (Sistema não funciona sem)
- [ ] Extensão `uuid-ossp` habilitada
- [ ] Scripts SQL executados (01, 02, 03)
- [ ] Site URL configurado
- [ ] Redirect URLs configurados
- [ ] Secret `RESEND_API_KEY` adicionado
- [ ] Secret `SUPABASE_SERVICE_ROLE_KEY` adicionado
- [ ] Superadmin criado

### ⚠️ Importante (Funcionalidades comprometidas sem)
- [ ] Extensão `pg_cron` habilitada
- [ ] Extensão `pg_net` habilitada
- [ ] Cron jobs configurados (verificar-prazos, limpar-rate-limits)
- [ ] Realtime configurado (script 04)
- [ ] Google OAuth configurado

### 💡 Recomendado (Melhor experiência)
- [ ] Nome do município configurado
- [ ] Brasão municipal enviado
- [ ] Cores do tema personalizadas
- [ ] Templates de e-mail personalizados
- [ ] CMEIs cadastrados
- [ ] Turmas cadastradas

---

## Troubleshooting

### Erro: "Permissão negada" ao executar scripts
- Certifique-se de estar usando o SQL Editor do Supabase (não cliente externo)
- Verifique se está conectado como administrador

### Erro: "Função não encontrada" (pg_cron)
- Habilite a extensão pg_cron em Database > Extensions
- Aguarde alguns segundos após habilitar antes de executar

### Erro: "Bucket já existe"
- Ignore este erro, significa que o bucket já foi criado

### Usuário não consegue fazer login
- Verifique se o email foi confirmado (ou desabilite confirmação em Auth > Providers)
- Verifique se as Redirect URLs estão configuradas corretamente

### Cron jobs não executam
1. Verifique se pg_cron e pg_net estão habilitados
2. Verifique se os jobs foram criados: `SELECT * FROM cron.job;`
3. Verifique os logs em Edge Function Logs

### Notificações não são enviadas
- Verifique se `RESEND_API_KEY` está configurado
- Verifique os logs da função `enviar-notificacao`

---

## Manutenção

### Tarefas Periódicas (Automáticas se cron configurado)
- Verificação de prazos vencidos: Diário às 06:00 UTC
- Limpeza de rate limits: A cada hora

### Tarefas Manuais Recomendadas
- Backup do banco: Semanal
- Verificação de logs de erro: Semanal
- Atualização de templates: Conforme necessidade

### Scripts Úteis

```sql
-- Verificar cron jobs
SELECT * FROM cron.job;

-- Ver histórico de execuções
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- Recalcular fila manualmente
SELECT public.recalcular_posicoes_fila();

-- Limpar rate limits manualmente
SELECT public.cleanup_old_rate_limits();
```

---

## Links Úteis

- [Documentação Supabase](https://supabase.com/docs)
- [Dashboard do Projeto](https://supabase.com/dashboard/project/SEU_PROJECT_ID)
- [Edge Functions](https://supabase.com/dashboard/project/SEU_PROJECT_ID/functions)
- [Storage](https://supabase.com/dashboard/project/SEU_PROJECT_ID/storage/buckets)
- [Authentication](https://supabase.com/dashboard/project/SEU_PROJECT_ID/auth/providers)
- [SQL Editor](https://supabase.com/dashboard/project/SEU_PROJECT_ID/sql/new)

---

## Versão

- **Guia**: v2.0
- **Data**: Dezembro 2024
- **Compatível com**: VAGOU v1.x
