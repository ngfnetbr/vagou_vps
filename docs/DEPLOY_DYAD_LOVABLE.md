# Deploy VAGOU via Dyad/Lovable + Supabase

## Visão Geral

Este guia explica como criar um novo sistema VAGOU para outra cidade usando Dyad/Lovable conectado a um Supabase em branco.

## Passo a Passo

### 1. Criar Projeto Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login
2. Clique em **New Project**
3. Escolha uma organização ou crie uma nova
4. Preencha:
   - **Name**: vagou-[nome-cidade]
   - **Database Password**: anote essa senha!
   - **Region**: South America (São Paulo)
5. Clique em **Create new project** e aguarde ~2 minutos

### 2. Obter Credenciais do Supabase

1. No dashboard do projeto, vá em **Settings > API**
2. Copie e anote:
   - **Project URL** (ex: https://xxxxx.supabase.co)
   - **anon public** key
   - **service_role secret** key

### 3. Executar Scripts SQL

No Supabase, vá em **SQL Editor** e execute os scripts **nesta ordem**:

#### Script 1: Estrutura (01-setup-estrutura.sql)
- Cria todas as tabelas, funções, triggers e políticas RLS
- Execute e aguarde concluir

#### Script 2: Storage (02-setup-storage.sql)  
- Cria os buckets de armazenamento
- Execute e aguarde concluir

#### Script 3: Dados Iniciais (03-setup-dados-iniciais.sql)
- Insere configurações e dados padrão
- Execute e aguarde concluir

### 4. Configurar Autenticação

1. No Supabase, vá em **Authentication > Providers**
2. Habilite **Email** (já vem habilitado por padrão)
3. (Opcional) Configure Google OAuth:
   - Habilite Google
   - Configure Client ID e Secret do Google Cloud Console

### 5. Importar Código no Dyad/Lovable

1. Baixe o código do GitHub: https://github.com/leonardo-gardin/Vagou-Lovable
2. Importe o projeto no Dyad/Lovable
3. Conecte ao Supabase usando as credenciais obtidas

### 6. Configurar Edge Functions

As Edge Functions são implantadas automaticamente pelo Lovable. Verifique em **Supabase > Edge Functions** se foram criadas.

### 7. Criar Primeiro Superadmin

1. Acesse o sistema e crie uma conta (cadastro normal)
2. No Supabase, vá em **SQL Editor** e execute:

```sql
-- Substitua pelo email do usuário criado
UPDATE public.user_roles 
SET role = 'superadmin' 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'seu-email@exemplo.com'
);
```

### 8. Configurar o Sistema

1. Faça login com a conta superadmin
2. Acesse **Configurações** no menu lateral
3. Preencha os dados da cidade:
   - Nome do município
   - Nome da secretaria
   - Contatos
   - Upload do brasão
   - Cores do tema

## Checklist Final

- [ ] Scripts SQL executados sem erros
- [ ] Storage buckets criados (4 buckets)
- [ ] Autenticação configurada
- [ ] Edge Functions deployadas
- [ ] Primeiro superadmin criado
- [ ] Configurações da cidade preenchidas
- [ ] Sistema acessível e funcional

## Troubleshooting

### Erro "relation does not exist"
Execute os scripts na ordem correta (01, 02, 03).

### Erro "permission denied"
Verifique se está usando a service_role key nas operações administrativas.

### Edge Functions não funcionam
Verifique os logs em Supabase > Edge Functions > Logs.

## Arquivos de Referência

- `scripts/setup/sql/01-setup-estrutura.sql` - Estrutura completa do banco
- `scripts/setup/sql/02-setup-storage.sql` - Buckets de storage
- `scripts/setup/sql/03-setup-dados-iniciais.sql` - Dados padrão
