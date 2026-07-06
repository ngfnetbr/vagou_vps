-- =============================================================================
-- VAGOU - Setup de Automação (pg_cron, Realtime, Scheduled Jobs)
-- =============================================================================
-- Execute APÓS o script 03-setup-dados-iniciais.sql
-- 
-- IMPORTANTE: Este script requer que as extensões pg_cron e pg_net estejam
-- habilitadas no projeto Supabase. Veja instruções abaixo.
-- =============================================================================

-- =============================================================================
-- PARTE 1: VERIFICAÇÃO DE EXTENSÕES
-- =============================================================================
-- As extensões pg_cron e pg_net devem ser habilitadas MANUALMENTE no Dashboard:
-- 1. Acesse: https://supabase.com/dashboard/project/[SEU_PROJECT_REF]/database/extensions
-- 2. Procure por "pg_cron" e clique em "Enable"
-- 3. Procure por "pg_net" e clique em "Enable"
--
-- Execute este comando para verificar se estão habilitadas:

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE '⚠️ ATENÇÃO: Extensão pg_cron NÃO está habilitada!';
    RAISE NOTICE '   Habilite em: Dashboard > Database > Extensions > pg_cron';
  ELSE
    RAISE NOTICE '✅ Extensão pg_cron está habilitada';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE '⚠️ ATENÇÃO: Extensão pg_net NÃO está habilitada!';
    RAISE NOTICE '   Habilite em: Dashboard > Database > Extensions > pg_net';
  ELSE
    RAISE NOTICE '✅ Extensão pg_net está habilitada';
  END IF;
END $$;

-- =============================================================================
-- PARTE 2: REALTIME
-- =============================================================================
-- Configura as tabelas para receberem atualizações em tempo real

-- Habilitar REPLICA IDENTITY FULL para capturar dados completos nas mudanças
ALTER TABLE public.criancas REPLICA IDENTITY FULL;
ALTER TABLE public.historico REPLICA IDENTITY FULL;
ALTER TABLE public.chat_mensagens REPLICA IDENTITY FULL;
ALTER TABLE public.notificacoes_log REPLICA IDENTITY FULL;
ALTER TABLE public.configuracoes_sistema REPLICA IDENTITY FULL;
ALTER TABLE public.auditoria REPLICA IDENTITY FULL;
ALTER TABLE public.turmas REPLICA IDENTITY FULL;
ALTER TABLE public.cmeis REPLICA IDENTITY FULL;
ALTER TABLE public.documentos_crianca REPLICA IDENTITY FULL;
ALTER TABLE public.crianca_prioridades REPLICA IDENTITY FULL;

-- Adicionar tabelas à publicação supabase_realtime
-- Nota: A publicação supabase_realtime já existe por padrão no Supabase
DO $$
DECLARE
  tables_to_add text[] := ARRAY[
    'criancas',
    'historico', 
    'chat_mensagens',
    'notificacoes_log',
    'configuracoes_sistema',
    'auditoria',
    'turmas',
    'cmeis',
    'documentos_crianca',
    'crianca_prioridades'
  ];
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY tables_to_add
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      RAISE NOTICE '✅ Tabela % adicionada ao Realtime', tbl;
    EXCEPTION 
      WHEN duplicate_object THEN
        RAISE NOTICE '⏭️ Tabela % já está no Realtime', tbl;
      WHEN undefined_object THEN
        RAISE NOTICE '⚠️ Tabela % não existe', tbl;
    END;
  END LOOP;
END $$;

-- =============================================================================
-- PARTE 3: VERIFICAÇÃO FINAL DO SCRIPT PRINCIPAL
-- =============================================================================

DO $$
DECLARE
  v_cron_enabled boolean;
  v_net_enabled boolean;
  v_realtime_count integer;
BEGIN
  SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') INTO v_cron_enabled;
  SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_net') INTO v_net_enabled;
  
  SELECT COUNT(*) INTO v_realtime_count
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime' AND schemaname = 'public';
  
  RAISE NOTICE '';
  RAISE NOTICE '========== RESUMO - SCRIPT PRINCIPAL ==========';
  RAISE NOTICE '';
  RAISE NOTICE 'EXTENSÕES:';
  RAISE NOTICE '  pg_cron: %', CASE WHEN v_cron_enabled THEN '✅ Habilitada' ELSE '❌ NÃO habilitada' END;
  RAISE NOTICE '  pg_net:  %', CASE WHEN v_net_enabled THEN '✅ Habilitada' ELSE '❌ NÃO habilitada' END;
  RAISE NOTICE '';
  RAISE NOTICE 'REALTIME:';
  RAISE NOTICE '  Tabelas configuradas: % (esperado: 10)', v_realtime_count;
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE '🔴 PRÓXIMO PASSO OBRIGATÓRIO:';
  RAISE NOTICE '   Execute a PARTE 4 abaixo para configurar os CRON JOBS';
  RAISE NOTICE '';
END $$;

-- =============================================================================
-- =============================================================================
--
--                    🔴 PARTE 4: CRON JOBS (EXECUÇÃO SEPARADA)
--
-- =============================================================================
-- =============================================================================
--
-- ⚠️  INSTRUÇÕES IMPORTANTES:
--
-- 1. COPIE todo o bloco abaixo (entre BEGIN e END do bloco SQL)
-- 2. SUBSTITUA os valores:
--    - [SEU_PROJECT_REF] = ID do seu projeto (ex: dizziofoxptanrqgxoue)
--    - [SUA_ANON_KEY] = Chave anônima do projeto
--
-- Para encontrar estes valores:
-- - Project Ref: Dashboard > Settings > General > Reference ID
-- - Anon Key: Dashboard > Settings > API > anon public
--
-- 3. COLE no SQL Editor do Supabase e EXECUTE
--
-- =============================================================================

/*
-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║                    CRON JOBS - COPIE E EXECUTE                            ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- ┌───────────────────────────────────────────────────────────────────────────┐
-- │ JOB 1: LIMPAR RATE LIMITS (OBRIGATÓRIO!)                                  │
-- │ Executa a cada hora - Limpa entradas de rate limit antigas                │
-- │ ⚠️ SEM ESTE JOB a tabela rate_limit_entries CRESCE INDEFINIDAMENTE!       │
-- └───────────────────────────────────────────────────────────────────────────┘

SELECT cron.schedule(
  'limpar-rate-limits-hora',
  '0 * * * *',
  $$SELECT cleanup_old_rate_limits();$$
);

-- ┌───────────────────────────────────────────────────────────────────────────┐
-- │ JOB 2: VERIFICAR PRAZOS VENCIDOS (RECOMENDADO)                            │
-- │ Executa diariamente às 6h UTC (3h Brasília)                               │
-- │ Verifica crianças com prazo de convocação expirado                        │
-- └───────────────────────────────────────────────────────────────────────────┘

SELECT cron.schedule(
  'verificar-prazos-diario',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://[SEU_PROJECT_REF].supabase.co/functions/v1/verificar-prazos',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer [SUA_ANON_KEY]"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  ) AS request_id;
  $$
);

-- ┌───────────────────────────────────────────────────────────────────────────┐
-- │ JOB 3: RECALCULAR FILA (OPCIONAL)                                         │
-- │ Executa diariamente às 5h UTC - Recalcula posições da fila                │
-- │ A fila já é recalculada automaticamente em cada mudança                   │
-- └───────────────────────────────────────────────────────────────────────────┘

-- Descomente se desejar:
-- SELECT cron.schedule(
--   'recalcular-fila-diario',
--   '0 5 * * *',
--   $$SELECT recalcular_posicoes_fila();$$
-- );

-- ┌───────────────────────────────────────────────────────────────────────────┐
-- │ VERIFICAÇÃO: Listar todos os jobs criados                                 │
-- └───────────────────────────────────────────────────────────────────────────┘

SELECT 
  jobid,
  jobname,
  schedule,
  active,
  CASE 
    WHEN jobname = 'limpar-rate-limits-hora' THEN '🔴 OBRIGATÓRIO'
    WHEN jobname = 'verificar-prazos-diario' THEN '🟡 RECOMENDADO'
    ELSE '🟢 OPCIONAL'
  END as importancia
FROM cron.job
ORDER BY jobname;

*/

-- =============================================================================
-- PARTE 5: SCRIPT DE VERIFICAÇÃO PÓS-CONFIGURAÇÃO
-- =============================================================================
-- Execute após configurar os cron jobs para verificar se tudo está correto

/*
DO $$
DECLARE
  v_cron_enabled boolean;
  v_net_enabled boolean;
  v_realtime_count integer;
  v_cron_jobs integer;
  v_has_rate_limit_job boolean;
  v_has_prazos_job boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') INTO v_cron_enabled;
  SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_net') INTO v_net_enabled;
  
  SELECT COUNT(*) INTO v_realtime_count
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime' AND schemaname = 'public';
  
  IF v_cron_enabled THEN
    SELECT COUNT(*) INTO v_cron_jobs FROM cron.job;
    SELECT EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'limpar-rate-limits-hora') INTO v_has_rate_limit_job;
    SELECT EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'verificar-prazos-diario') INTO v_has_prazos_job;
  ELSE
    v_cron_jobs := 0;
    v_has_rate_limit_job := false;
    v_has_prazos_job := false;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '╔═══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║           VERIFICAÇÃO COMPLETA DE AUTOMAÇÃO                   ║';
  RAISE NOTICE '╚═══════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '┌─────────────────────────────────────────────────────────────┐';
  RAISE NOTICE '│ EXTENSÕES                                                   │';
  RAISE NOTICE '├─────────────────────────────────────────────────────────────┤';
  RAISE NOTICE '│ pg_cron: %', CASE WHEN v_cron_enabled THEN '✅ Habilitada                                       │' ELSE '❌ NÃO habilitada (CRÍTICO!)                        │' END;
  RAISE NOTICE '│ pg_net:  %', CASE WHEN v_net_enabled THEN '✅ Habilitada                                       │' ELSE '❌ NÃO habilitada                                   │' END;
  RAISE NOTICE '└─────────────────────────────────────────────────────────────┘';
  RAISE NOTICE '';
  RAISE NOTICE '┌─────────────────────────────────────────────────────────────┐';
  RAISE NOTICE '│ REALTIME                                                    │';
  RAISE NOTICE '├─────────────────────────────────────────────────────────────┤';
  RAISE NOTICE '│ Tabelas: % de 10 esperadas %', v_realtime_count, CASE WHEN v_realtime_count >= 10 THEN '✅                             │' ELSE '⚠️                             │' END;
  RAISE NOTICE '└─────────────────────────────────────────────────────────────┘';
  RAISE NOTICE '';
  RAISE NOTICE '┌─────────────────────────────────────────────────────────────┐';
  RAISE NOTICE '│ CRON JOBS                                                   │';
  RAISE NOTICE '├─────────────────────────────────────────────────────────────┤';
  RAISE NOTICE '│ Total de jobs: %                                            │', v_cron_jobs;
  RAISE NOTICE '│ limpar-rate-limits-hora: %', CASE WHEN v_has_rate_limit_job THEN '✅ Configurado (OBRIGATÓRIO)      │' ELSE '❌ NÃO configurado (CRÍTICO!)      │' END;
  RAISE NOTICE '│ verificar-prazos-diario: %', CASE WHEN v_has_prazos_job THEN '✅ Configurado                      │' ELSE '⚠️ NÃO configurado (recomendado)   │' END;
  RAISE NOTICE '└─────────────────────────────────────────────────────────────┘';
  
  IF NOT v_cron_enabled OR NOT v_has_rate_limit_job THEN
    RAISE NOTICE '';
    RAISE NOTICE '🔴 AÇÕES CRÍTICAS NECESSÁRIAS:';
    IF NOT v_cron_enabled THEN
      RAISE NOTICE '   - Habilite pg_cron: Dashboard > Database > Extensions';
    END IF;
    IF NOT v_has_rate_limit_job THEN
      RAISE NOTICE '   - Configure o cron job "limpar-rate-limits-hora"';
      RAISE NOTICE '     Sem ele, a tabela rate_limit_entries crescerá indefinidamente!';
    END IF;
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✅ Configuração de automação COMPLETA!';
  END IF;
  
  RAISE NOTICE '';
END $$;
*/
