# Análise dos Issues do Supabase - VAGOU

**Data:** 17/12/2025  
**Total de Issues:** 136
- 🔴 **Segurança:** 2 issues
- 🟡 **Performance:** 134 issues

---

## 📊 Resumo dos Issues

### 🔴 Segurança (2 issues)

#### 1. Extension in Public Schema
- **Issue:** `pg_net` está instalado no schema `public`
- **Nível:** WARN
- **Impacto:** Baixo (não é crítico, mas recomendado mover)
- **Ação:** Opcional - mover para outro schema (ex: `extensions`)
- **Status:** 📋 Documentado

#### 2. Leaked Password Protection Disabled
- **Issue:** Proteção de senhas vazadas desabilitada
- **Nível:** WARN
- **Impacto:** Médio (prevenção de senhas comprometidas)
- **Ação:** Habilitar no Dashboard do Supabase
- **Status:** ⚠️ **AÇÃO MANUAL NECESSÁRIA**

---

### 🟡 Performance (134 issues)

#### 1. Unused Indexes (33 issues)
- **Problema:** Índices nunca foram usados
- **Nível:** INFO
- **Impacto:** Baixo (overhead de escrita, mas não crítico)
- **Observação:** ⚠️ **Os índices que acabamos de criar aparecem aqui porque são novos!** Isso é normal e esperado.
- **Ação:** Monitorar por 30 dias antes de remover
- **Status:** 📋 Documentado

**Índices não utilizados (incluindo os novos):**
- `idx_auditoria_usuario_id` (novo)
- `idx_criancas_responsavel_user_id` (novo)
- `idx_criancas_created_by` (novo)
- `idx_criancas_updated_by` (novo)
- `idx_historico_usuario_id` (novo)
- `idx_documentos_crianca_enviado_por` (novo)
- `idx_documentos_crianca_tipo_documento_id` (novo)
- `idx_chat_mensagens_enviado_por` (novo)
- `idx_chat_mensagens_lida_por` (novo)
- E outros...

#### 2. Multiple Permissive Policies (100 issues)
- **Problema:** Múltiplas políticas RLS permissivas para o mesmo role e action
- **Nível:** WARN
- **Impacto:** **ALTO** - Cada query executa TODAS as políticas, degradando performance
- **Ação:** Consolidar políticas usando `OR`
- **Status:** 🔴 **CRÍTICO - PRECISA CORREÇÃO**

**Tabelas afetadas (exemplos):**
- `campos_inscricao` - 5 policies duplicadas (SELECT)
- `chat_*` - Várias tabelas com policies duplicadas
- `criancas` - 3 policies duplicadas (SELECT, INSERT, UPDATE)
- `documentos_crianca` - 3 policies duplicadas (SELECT, INSERT, UPDATE)
- `cmeis` - 5 policies duplicadas (SELECT)
- `turmas` - 5 policies duplicadas (SELECT)
- E muitas outras...

#### 3. Auth DB Connections Absolute (1 issue)
- **Problema:** Auth usa número absoluto de conexões (10) em vez de percentual
- **Nível:** INFO
- **Impacto:** Baixo (afeta escalabilidade, mas não performance atual)
- **Ação:** Configurar para usar percentual no Dashboard
- **Status:** 📋 Documentado

---

## 🎯 Priorização de Correções

### 🔴 Crítico (Fazer Agora)
1. ✅ **Consolidar políticas RLS duplicadas** (100 issues)
   - **Impacto:** Alto - Melhora performance de queries
   - **Esforço:** Médio - Requer revisão cuidadosa
   - **Status:** 🔄 Em progresso

### 🟡 Importante (Fazer Esta Semana)
2. ⚠️ **Habilitar proteção de senhas vazadas** (2 minutos)
   - **Impacto:** Médio - Segurança
   - **Esforço:** Baixo - Ação manual no Dashboard
   - **Status:** ⚠️ Pendente

### 🟢 Opcional (Monitorar)
3. 📋 **Monitorar índices não utilizados** (30 dias)
   - **Impacto:** Baixo - Overhead mínimo
   - **Esforço:** Baixo - Apenas monitoramento
   - **Status:** 📋 Documentado

4. 📋 **Mover pg_net para outro schema** (opcional)
   - **Impacto:** Baixo - Boa prática
   - **Esforço:** Médio - Requer migration
   - **Status:** 📋 Documentado

5. 📋 **Configurar Auth para conexões percentuais** (opcional)
   - **Impacto:** Baixo - Escalabilidade
   - **Esforço:** Baixo - Configuração no Dashboard
   - **Status:** 📋 Documentado

---

## 📈 Impacto Esperado das Correções

### Antes
- **Queries com RLS:** Executam múltiplas políticas (2-5x mais lento)
- **Queries de SELECT:** ~200-500ms em tabelas com policies duplicadas
- **Queries de INSERT/UPDATE:** ~300-800ms

### Depois (estimado)
- **Queries com RLS:** Executam 1 política consolidada
- **Queries de SELECT:** ~50-150ms (**3-5x mais rápido**)
- **Queries de INSERT/UPDATE:** ~100-200ms (**3-4x mais rápido**)

---

## 🔍 Detalhamento: Multiple Permissive Policies

### Como Funciona RLS

Quando há múltiplas políticas **PERMISSIVE** para o mesmo role e action:
- PostgreSQL executa **TODAS** as políticas
- Se **qualquer** política retornar `true`, o acesso é permitido
- Isso significa overhead desnecessário

### Exemplo do Problema

**Tabela:** `campos_inscricao`

**Políticas atuais:**
1. `Admin can manage form fields` - `is_admin()`
2. `Anyone can view active form fields` - `ativo = true`

**Problema:** Para cada SELECT, ambas as políticas são executadas!

**Solução:** Consolidar em uma única política:
```sql
-- Antes (2 políticas)
CREATE POLICY "Admin can manage form fields" ON campos_inscricao FOR SELECT USING (is_admin());
CREATE POLICY "Anyone can view active form fields" ON campos_inscricao FOR SELECT USING (ativo = true);

-- Depois (1 política consolidada)
CREATE POLICY "View form fields" ON campos_inscricao FOR SELECT USING (is_admin() OR ativo = true);
```

### Tabelas Mais Afetadas

| Tabela | Policies Duplicadas | Ações Afetadas | Impacto |
|--------|---------------------|----------------|---------|
| `criancas` | 3 | SELECT, INSERT, UPDATE | 🔴 Alto |
| `documentos_crianca` | 3 | SELECT, INSERT, UPDATE | 🔴 Alto |
| `chat_mensagens` | 2 | SELECT, INSERT | 🔴 Alto |
| `campos_inscricao` | 5 | SELECT | 🟡 Médio |
| `cmeis` | 5 | SELECT | 🟡 Médio |
| `turmas` | 5 | SELECT | 🟡 Médio |

---

## ✅ Próximos Passos

1. ✅ Criar migration para consolidar políticas RLS
2. ⚠️ Aplicar migration
3. ⚠️ Habilitar proteção de senhas no Dashboard
4. 📋 Monitorar performance após correções
5. 📋 Revisar índices não utilizados em 30 dias

---

**Última atualização:** 17/12/2025

