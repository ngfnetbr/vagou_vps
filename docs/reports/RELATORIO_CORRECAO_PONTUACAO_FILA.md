## Resumo

Foram corrigidos problemas na lógica de cálculo, recálculo, ordenação e exibição de pontuação da fila. O efeito observado era: pontuações exibidas como 0 mesmo com critérios aplicados, e ordenação aparente incorreta (itens com 0 “na frente” de itens com 50).

## Bugs encontrados

1. **Pontuação “0” por ausência de cálculo**
   - As colunas de score (`score_cmei1/2/3`) e/ou componentes da pontuação podiam estar nulas/defasadas para registros existentes.
   - A UI exibia `0` como fallback quando o score vinha `null/undefined`, mascarando “não calculado” como “zero”.

2. **Recálculo não disparava quando critérios mudavam**
   - Existia trigger para recálculo baseada principalmente em mudanças de `status`/`prioridade`.
   - Pontuação depende também de `programas_sociais`, `data_penalidade`, `zona_atendimento_id`, preferências de CMEI e registros em `crianca_prioridades`.
   - Isso causava scores/posições desatualizados até rodar recálculo manual.

3. **Ordenação global misturava filas de CMEIs diferentes**
   - `posicao_fila` é calculada por CMEI (posição “local” dentro da preferência), e não é comparável globalmente entre CMEIs.
   - A listagem “geral” sem filtro de CMEI pode parecer errada quando comparada por “pontuação” (ex.: 0 vs 50).

## Correções implementadas

### Banco de dados

1. **Componentes da pontuação armazenados na tabela**
   - Adicionadas colunas para auditoria e UI:
     - `pontos_prioridades`, `pontos_programas_sociais`, `pontos_remanejamento`, `pontos_data_cadastro`
     - `bonus_zona_cmei1`, `bonus_zona_cmei2`, `bonus_zona_cmei3`
   - A função `recalcular_posicoes_fila()` passou a preencher essas colunas e a usar `GREATEST(0, ...)` para impedir pontos negativos.
   - Migração: [20260402000021_add_score_breakdown_columns.sql](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/supabase/migrations/20260402000021_add_score_breakdown_columns.sql)

2. **Triggers de recálculo cobrindo mudanças relevantes**
   - `criancas`: recálculo ao mudar status/prioridade e também `programas_sociais`, `data_penalidade`, `zona_atendimento_id`, preferências e remanejamento.
   - `crianca_prioridades`: recálculo após insert/update/delete (status/prioridade_id/crianca_id).
   - `configuracoes_sistema`: recálculo quando pesos/toggles mudam.
   - `tipos_prioridade` e `cmei_zonas`: recálculo quando pesos e vínculos mudam.
   - Migração: [20260402000022_fix_recalculo_pontuacao_triggers_auditoria.sql](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/supabase/migrations/20260402000022_fix_recalculo_pontuacao_triggers_auditoria.sql)

3. **Auditoria segura via RPC**
   - Função `get_pontuacao_fila_detalhada(crianca_id)` retorna score + componentes + pesos configurados.
   - Restrita a perfis com role `admin/superadmin/gestor/diretor_cmei`.
   - Migração: [20260402000023_secure_get_pontuacao_fila_detalhada.sql](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/supabase/migrations/20260402000023_secure_get_pontuacao_fila_detalhada.sql)

### Frontend

1. **Exibição correta (sem mascarar “não calculado” como 0)**
   - A coluna “Pontuação” agora exibe `—` quando o valor não está calculado, e o tooltip indica “Pontuação não calculada”.
   - Utilitário centralizado: [fila-score.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/utils/fila-score.ts)
   - Uso na fila admin: [FilaEspera.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/pages/admin/FilaEspera.tsx)

2. **Ordenação coerente com pontuação**
   - Sem filtro de CMEI: ordena por convocação, remanejamento, prioridade social efetiva, e score global (desc).
   - Com filtro de CMEI: usa a posição específica da preferência (CMEI1/2/3) e desempates por timestamps.
   - Implementação centralizada em [fila-score.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/utils/fila-score.ts) e aplicada no hook [useFilaEspera](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/hooks/api/criancas-hooks.ts).

3. **Tooltip com quebra de linha**
   - Ajuste para renderizar linhas no tooltip:
   - [tooltip-helper.tsx](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/src/components/ui/tooltip-helper.tsx)

## Testes adicionados

- Testes (runner existente do projeto) para validar seleção de score, tooltip e ordenação:
  - [fila-score-utils.spec.ts](file:///c:/Users/User/Desktop/backup%2000h42%2021-03Vagou/Vagou/vagou/tests/e2e/fila-score-utils.spec.ts)

## Checklist de verificação (auditoria)

1. **Ver score e componentes no banco**
   - `select score_cmei1, pontos_programas_sociais, pontos_prioridades from criancas where id = '<crianca_id>';`

2. **Ver detalhes via RPC (admin)**
   - `select * from public.get_pontuacao_fila_detalhada('<crianca_id>');`

3. **Ver se scores não ficam nulos**
   - `select count(*) filter (where score_cmei1 is null) from criancas where status='Fila de Espera';`

