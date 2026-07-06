# 🚀 Guia Rápido de Clonagem do VAGOU

Este guia permite clonar o projeto VAGOU para uma nova cidade em **menos de 15 minutos**.

---

## 📋 Pré-requisitos

- [ ] Conta no [Supabase](https://supabase.com)
- [ ] Node.js instalado (v18+)
- [ ] Git instalado
- [ ] Código fonte do VAGOU

---

## 🔄 Processo de Clonagem (4 Passos)

### Passo 1: Criar Projeto Supabase

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard)
2. Clique em **New Project**
3. Configure:
   - **Nome**: `vagou-[nome-cidade]`
   - **Região**: South America (São Paulo)
   - **Password**: Guarde em local seguro!
4. Aguarde a criação (~2 minutos)

### Passo 2: Coletar Credenciais

No Dashboard do projeto criado:

1. Vá em **Settings** → **API**
2. Copie:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Project Reference**: `xxxxx` (apenas o ID)
   - **anon public key**: `eyJhbGci...`

### Passo 3: Executar SQL

No Supabase, vá em **SQL Editor** e execute os scripts **na ordem**:

```
1️⃣ scripts/setup/sql/01-setup-estrutura.sql   (~30 segundos)
2️⃣ scripts/setup/sql/02-setup-storage.sql     (~5 segundos)
3️⃣ scripts/setup/sql/03-setup-dados-iniciais.sql (~5 segundos)
4️⃣ scripts/setup/sql/04-setup-automacao.sql   (opcional, para cron jobs)
```

> ⚠️ **Execute um de cada vez** e verifique se não há erros antes de prosseguir.

### Passo 4: Deploy & Configuração

Execute o script de deploy:

```bash
chmod +x scripts/deploy/deploy-projeto-novo.sh
./scripts/deploy/deploy-projeto-novo.sh
```

O script irá:
- ✅ Atualizar `supabase/config.toml`
- ✅ Atualizar `.env`
- ✅ Fazer login no Supabase CLI
- ✅ Vincular ao projeto
- ✅ Deploiar todas as 15 Edge Functions

---

## 🔧 Configurações Manuais

### Secrets (Dashboard → Functions → Secrets)

| Secret | Descrição | Obrigatório |
|--------|-----------|-------------|
| `RESEND_API_KEY` | API key do Resend para emails | ✅ Sim |
| `GOOGLE_MAPS_API_KEY` | Para exibir mapas | ❌ Não |
| `WEBHOOK_WHATSAPP_SECRET` | Para integração WhatsApp | ❌ Não |

### Criar Superadmin

1. Acesse o sistema e crie uma conta normal
2. No SQL Editor, execute:

```sql
-- Substitua pelo email da conta criada
UPDATE public.user_roles 
SET role = 'superadmin' 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'admin@cidade.gov.br'
);

-- Verifique se funcionou
SELECT * FROM public.user_roles WHERE role = 'superadmin';
```

### Configurações do Sistema

Acesse **Admin → Configurações** e configure:
- Nome do município
- Secretaria de Educação
- Email e telefone de contato
- Brasão municipal
- Cores do tema

---

## 📊 Verificação Final

Execute no SQL Editor para verificar a instalação:

```sql
-- Contagem de objetos criados
SELECT 
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as tabelas,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as politicas_rls,
  (SELECT COUNT(*) FROM storage.buckets) as buckets,
  (SELECT EXISTS(SELECT 1 FROM configuracoes_sistema)) as config_existe;
```

**Resultado esperado:**
- Tabelas: 38+
- Políticas RLS: 80+
- Buckets: 5
- Config existe: true

---

## 🆘 Solução de Problemas

### "Erro de permissão ao inserir"
✅ Verifique se as políticas RLS foram criadas corretamente

### "Edge function retorna 500"
✅ Verifique se os secrets foram configurados

### "Login não funciona"
✅ Verifique se o trigger `on_auth_user_created` existe:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

### "Usuário não tem acesso admin"
✅ Verifique a tabela `user_roles`:
```sql
SELECT * FROM user_roles WHERE user_id = 'ID_DO_USUARIO';
```

---

## 📁 Estrutura de Scripts

```
scripts/
├── 01-setup-estrutura.sql      # Tabelas, funções, triggers, RLS
├── 02-setup-storage.sql        # Storage buckets e políticas
├── 03-setup-dados-iniciais.sql # Dados default (turmas, templates)
├── 04-setup-automacao.sql      # Realtime e cron jobs
├── 05-setup-superadmin.sql     # Script de promoção de usuário
└── deploy-projeto-novo.sh      # Script automatizado de deploy
```

---

## ⏱️ Tempo Total Estimado

| Etapa | Tempo |
|-------|-------|
| Criar projeto Supabase | 2 min |
| Executar SQLs | 2 min |
| Deploy Edge Functions | 5 min |
| Configurações manuais | 5 min |
| **Total** | **~15 min** |

---

## 📞 Suporte

Em caso de problemas:
1. Verifique os logs do Supabase Dashboard
2. Consulte a documentação completa em `docs/DOCUMENTACAO_COMPLETA.md`
3. Entre em contato com a equipe de desenvolvimento
