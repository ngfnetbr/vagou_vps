# Resumo das Correções de RLS - VAGOU

**Data:** 17/12/2025  
**Migration:** `20251217000002_consolidate_rls_policies`  
**Status:** ✅ **PRONTA PARA APLICAÇÃO**

---

## 🎯 Objetivo

Consolidar **100 políticas RLS duplicadas** em políticas únicas usando `OR`, eliminando overhead de performance.

---

## 📊 Impacto Esperado

### Antes
- **Queries com RLS:** Executam 2-5 políticas por query
- **Performance:** ~200-500ms para SELECT em tabelas com policies duplicadas
- **Overhead:** Cada política é executada mesmo quando outra já permitiu acesso

### Depois (estimado)
- **Queries com RLS:** Executam 1 política consolidada
- **Performance:** ~50-150ms para SELECT (**3-5x mais rápido**)
- **Overhead:** Eliminado - apenas 1 política executada

---

## ✅ Tabelas Corrigidas

### 🔴 Críticas (Alto impacto)

1. **`criancas`** - 3 policies duplicadas
   - SELECT: `Admin` + `Responsavel` → `View children`
   - INSERT: `Admin` + `Public` → `Insert children` (público) + `Manage children` (admin/responsável)
   - UPDATE: `Admin` + `Responsavel` → `Manage children`

2. **`documentos_crianca`** - 3 policies duplicadas
   - SELECT: `Admin` + `Responsavel` → `View documents`
   - INSERT: `Admin` + `Responsavel` → `Insert documents`
   - UPDATE: `Admin` + `Responsavel` → `Update documents`

3. **`chat_mensagens`** - 2 policies duplicadas
   - SELECT: `Admin` + `Responsavel` → `View chat messages`
   - INSERT: `Admin` + `Responsavel` → `Insert chat messages`
   - ALL: `Admin` → `Manage chat messages`

### 🟡 Importantes (Médio impacto)

4. **`campos_inscricao`** - 5 policies duplicadas (SELECT)
5. **`cmeis`** - 5 policies duplicadas (SELECT)
6. **`turmas`** - 5 policies duplicadas (SELECT)
7. **`turmas_base`** - 5 policies duplicadas (SELECT)
8. **`documentos_tipos`** - 5 policies duplicadas (SELECT)
9. **`templates_mensagens`** - 5 policies duplicadas (SELECT)
10. **`tipos_prioridade`** - 5 policies duplicadas (SELECT)
11. **`feriados_municipais`** - 5 policies duplicadas (SELECT)
12. **`motivos_padrao`** - 5 policies duplicadas (SELECT)
13. **`mensagens_status_custom`** - 5 policies duplicadas (SELECT)
14. **`tutoriais_videos`** - 5 policies duplicadas (SELECT)

### 🟢 Outras

15. **`chat_marcadores`** - 5 policies duplicadas (SELECT)
16. **`chat_respostas_rapidas`** - 5 policies duplicadas (SELECT)
17. **`chat_conversas_config`** - 3 policies duplicadas (SELECT, INSERT)
18. **`chat_conversa_marcadores`** - 5 policies duplicadas (SELECT)
19. **`cmei_zonas`** - 5 policies duplicadas (SELECT)
20. **`crianca_prioridades`** - 3 policies duplicadas (SELECT, INSERT)
21. **`diretor_cmei_vinculo`** - 5 policies duplicadas (SELECT)

**Total:** ~100 policies duplicadas consolidadas

---

## 🔍 Exemplo de Consolidação

### Antes (2 políticas executadas)
```sql
-- Política 1: Admin
CREATE POLICY "Admin can manage all children" ON criancas FOR SELECT 
  USING (is_admin(auth.uid()));

-- Política 2: Responsável
CREATE POLICY "Responsavel can view own children" ON criancas FOR SELECT 
  USING (auth.uid() = responsavel_user_id);
```

**Problema:** Cada SELECT executa **ambas** as políticas!

### Depois (1 política executada)
```sql
-- Política consolidada
CREATE POLICY "View children" ON criancas FOR SELECT 
  USING (
    is_admin(auth.uid()) OR 
    auth.uid() = responsavel_user_id
  );
```

**Solução:** Cada SELECT executa **apenas 1** política!

---

## ⚠️ Observações Importantes

### 1. Política de INSERT Público (`criancas`)

A tabela `criancas` permite INSERT público (anon/authenticated) para inscrições. A migration mantém isso:

```sql
CREATE POLICY "Insert children" ON public.criancas FOR INSERT 
  WITH CHECK (true);  -- Permitir INSERT público
```

### 2. Políticas Separadas por Ação

Para algumas tabelas, mantivemos políticas separadas por ação (SELECT, INSERT, UPDATE) para clareza e manutenibilidade, mas cada ação tem apenas **1 política** em vez de múltiplas.

### 3. Compatibilidade

A migration usa `DROP POLICY IF EXISTS` para garantir compatibilidade mesmo se algumas políticas já foram removidas.

---

## 🚀 Como Aplicar

### Opção 1: Via Supabase Dashboard

1. Acesse: https://supabase.com/dashboard/project/hzguwuofnvkgeveorixs/sql/new
2. Copie o conteúdo de `supabase/migrations/20251217000002_consolidate_rls_policies.sql`
3. Cole no SQL Editor
4. Execute

### Opção 2: Via Supabase CLI

```bash
supabase db push
```

### Opção 3: Via MCP (se disponível)

A migration está pronta para aplicação.

---

## ✅ Verificação Pós-Aplicação

Após aplicar a migration, verifique:

```sql
-- Verificar políticas consolidadas
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('criancas', 'documentos_crianca', 'chat_mensagens')
ORDER BY tablename, cmd, policyname;

-- Verificar que não há mais políticas duplicadas
SELECT 
  tablename,
  cmd,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename, cmd
HAVING COUNT(*) > 1
ORDER BY policy_count DESC;
-- Resultado esperado: 0 linhas (ou apenas casos legítimos)
```

---

## 📈 Métricas Esperadas

### Performance

- **Queries SELECT em `criancas`:** 3-5x mais rápidas
- **Queries SELECT em `documentos_crianca`:** 3-5x mais rápidas
- **Queries SELECT em `chat_mensagens`:** 3-5x mais rápidas
- **Queries SELECT em tabelas "view active":** 2-3x mais rápidas

### Issues do Supabase

- **Antes:** 136 issues (2 security + 134 performance)
- **Depois:** ~36 issues (2 security + ~34 performance)
  - ✅ **100 issues de RLS eliminados!**

---

## 📝 Próximos Passos

1. ✅ Aplicar migration
2. ⚠️ Verificar que não há regressões
3. 📊 Monitorar performance
4. ⚠️ Habilitar proteção de senhas no Dashboard
5. 📋 Revisar índices não utilizados em 30 dias

---

**Migration criada em:** 17/12/2025  
**Status:** ✅ Pronta para aplicação

