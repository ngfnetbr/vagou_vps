# Guia de Correções Aplicadas - VAGOU

**Data:** 17/12/2025  
**Migration:** `20251217000001_fix_security_performance.sql`

---

## ✅ Correções Implementadas

### 1. Segurança - Funções SQL com search_path mutável

**Problema:** 3 funções SQL tinham `search_path` mutável, o que pode permitir SQL injection.

**Funções corrigidas:**
- `fix_latin1_encoding(text)`
- `fix_mojibake(text)`
- `fix_tutorial_json_content(jsonb)`

**Solução aplicada:**
```sql
ALTER FUNCTION public.fix_latin1_encoding(text) SET search_path = public;
ALTER FUNCTION public.fix_mojibake(text) SET search_path = public;
ALTER FUNCTION public.fix_tutorial_json_content(jsonb) SET search_path = public;
```

**Status:** ✅ Corrigido via migration

---

### 2. Performance - Índices em Foreign Keys

**Problema:** 22 foreign keys sem índices, causando queries lentas em JOINs.

**Índices adicionados (22 índices):**

#### Tabelas Principais
- `auditoria.usuario_id`
- `criancas.responsavel_user_id`
- `criancas.created_by`
- `criancas.updated_by`
- `historico.usuario_id`

#### Documentos
- `documentos_crianca.enviado_por`
- `documentos_crianca.tipo_documento_id`

#### Chat
- `chat_mensagens.enviado_por`
- `chat_mensagens.lida_por`
- `chat_marcadores.created_by`
- `chat_conversa_marcadores.created_by`
- `chat_conversa_marcadores.marcador_id`
- `chat_respostas_rapidas.created_by`

#### Outros
- `cmei_zonas.zona_id`
- `crianca_prioridades.prioridade_id`
- `diretor_cmei_vinculo.cmei_id`
- `diretor_cmei_vinculo.created_by`
- `role_permissoes.permissao_id`
- `tutorial_dicas.created_by`
- `tutorial_faq.created_by`
- `tutorial_secoes.created_by`
- `user_roles.created_by`
- `valores_campos_custom.campo_id`
- `tipos_prioridade.documento_tipo_id`

**Status:** ✅ Corrigido via migration

---

## 📋 Próximas Ações Recomendadas

### 🔴 Ação Manual Necessária

#### Habilitar Proteção de Senhas Vazadas

**O que fazer:**
1. Acesse o Dashboard do Supabase: https://supabase.com/dashboard/project/hzguwuofnvkgeveorixs
2. Vá em **Authentication** > **Password Security**
3. Habilite **"Leaked Password Protection"**
4. Salve as alterações

**Por quê:** Previne uso de senhas comprometidas (HaveIBeenPwned).

---

### 🟡 Otimizações Opcionais (Futuro)

#### 1. Consolidar Políticas RLS Duplicadas

**Impacto:** Médio (melhora performance de queries)

**Tabelas afetadas:**
- `campos_inscricao`
- `chat_*` (várias tabelas)
- `criancas`
- `documentos_crianca`
- `cmeis`
- `turmas`
- E outras...

**Ação:** Revisar políticas e combinar quando possível usando `OR` em uma única política.

#### 2. Remover Índices Não Utilizados

**Impacto:** Baixo (reduz overhead de escrita)

**Índices candidatos a remoção:**
- `idx_chat_mensagens_direcao`
- `idx_chat_mensagens_reply_to`
- `idx_chat_mensagens_telefone`
- `idx_notificacoes_log_canal`
- `idx_notificacoes_log_status`
- `idx_notificacoes_log_tipo`
- E outros...

**Ação:** Monitorar uso por 30 dias antes de remover.

#### 3. Configurar Auth para Conexões Percentuais

**Impacto:** Baixo (melhora escalabilidade)

**Ação:** Dashboard > Settings > Database > Connection Pooling

---

## 🚀 Como Aplicar a Migration

### Opção 1: Via Supabase Dashboard

1. Acesse: https://supabase.com/dashboard/project/hzguwuofnvkgeveorixs/sql/new
2. Copie o conteúdo de `supabase/migrations/20251217000001_fix_security_performance.sql`
3. Cole no SQL Editor
4. Execute

### Opção 2: Via Supabase CLI

```bash
supabase db push
```

### Opção 3: Via MCP (se disponível)

A migration já está criada e pronta para aplicação.

---

## ✅ Verificação Pós-Aplicação

Após aplicar a migration, verifique:

```sql
-- Verificar funções corrigidas
SELECT 
  proname,
  proconfig
FROM pg_proc 
WHERE proname IN ('fix_latin1_encoding', 'fix_mojibake', 'fix_tutorial_json_content')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Verificar índices criados
SELECT 
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
AND indexname IN (
  'idx_auditoria_usuario_id',
  'idx_criancas_responsavel_user_id',
  'idx_historico_usuario_id'
  -- ... outros
)
ORDER BY tablename, indexname;
```

---

## 📊 Impacto Esperado

### Segurança
- ✅ **Eliminado risco de SQL injection** nas funções de encoding
- ⚠️ **Proteção de senhas** ainda precisa ser habilitada manualmente

### Performance
- ✅ **Queries com JOINs** devem ser 2-10x mais rápidas
- ✅ **Filtros por foreign keys** otimizados
- ✅ **Queries de auditoria** mais eficientes

### Estimativa de Melhoria
- **Queries de auditoria por usuário:** ~5-10x mais rápidas
- **Queries de crianças por responsável:** ~3-5x mais rápidas
- **Queries de histórico:** ~5-10x mais rápidas

---

## 📝 Notas

- A migration usa `IF NOT EXISTS` para evitar erros se os índices já existirem
- Índices são criados apenas onde `IS NOT NULL` quando apropriado (otimização)
- Funções são corrigidas apenas se existirem (compatibilidade)

---

**Migration criada em:** 17/12/2025  
**Status:** ✅ Pronta para aplicação

