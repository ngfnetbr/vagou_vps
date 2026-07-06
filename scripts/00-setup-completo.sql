-- =============================================================================
-- VAGOU - Script COMPLETO de Setup do Banco de Dados
-- =============================================================================
-- Este script unifica 01-estrutura, 02-storage, 03-dados-iniciais e 04-automacao
-- Execute este único arquivo no SQL Editor do Supabase para criar TUDO
-- 
-- TEMPO ESTIMADO: 30-60 segundos
-- =============================================================================

-- =============================================================================
-- PARTE 1: ESTRUTURA (Extensões, ENUMs, Tabelas, Funções, Triggers, RLS)
-- =============================================================================
\i '01-setup-estrutura.sql'

-- =============================================================================
-- PARTE 2: STORAGE (Buckets e Políticas)
-- =============================================================================
\i '02-setup-storage.sql'

-- =============================================================================
-- PARTE 3: DADOS INICIAIS
-- =============================================================================
\i '03-setup-dados-iniciais.sql'

-- =============================================================================
-- PARTE 4: AUTOMAÇÃO (Realtime)
-- =============================================================================
\i '04-setup-automacao.sql'

-- =============================================================================
-- PARTE 5: PERFORMANCE FIXES
-- =============================================================================
\i '99-fix-rls-performance.sql'

-- =============================================================================
-- VERIFICAÇÃO FINAL
-- =============================================================================
DO $$
DECLARE
  v_tables integer;
  v_functions integer;
  v_triggers integer;
  v_policies integer;
  v_buckets integer;
  v_config_exists boolean;
  v_user_trigger_exists boolean;
BEGIN
  -- Contar tabelas
  SELECT COUNT(*) INTO v_tables
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  
  -- Contar funções
  SELECT COUNT(*) INTO v_functions
  FROM information_schema.routines
  WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';
  
  -- Contar triggers
  SELECT COUNT(DISTINCT trigger_name) INTO v_triggers
  FROM information_schema.triggers
  WHERE trigger_schema = 'public';
  
  -- Contar políticas RLS
  SELECT COUNT(*) INTO v_policies
  FROM pg_policies WHERE schemaname = 'public';
  
  -- Contar buckets
  SELECT COUNT(*) INTO v_buckets FROM storage.buckets;
  
  -- Verificar configuração inicial
  SELECT EXISTS(SELECT 1 FROM public.configuracoes_sistema LIMIT 1) INTO v_config_exists;
  
  -- Verificar trigger de usuário
  SELECT EXISTS(
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname = 'on_auth_user_created' AND n.nspname = 'auth'
  ) INTO v_user_trigger_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '╔═══════════════════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║               VAGOU - SETUP COMPLETO FINALIZADO                           ║';
  RAISE NOTICE '╚═══════════════════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '┌─────────────────────────────────────────────────────────────────────────┐';
  RAISE NOTICE '│ ESTATÍSTICAS DO BANCO                                                   │';
  RAISE NOTICE '├─────────────────────────────────────────────────────────────────────────┤';
  RAISE NOTICE '│ Tabelas criadas:      % (esperado: 38+)                              │', LPAD(v_tables::text, 3);
  RAISE NOTICE '│ Funções criadas:      % (esperado: 20+)                              │', LPAD(v_functions::text, 3);
  RAISE NOTICE '│ Triggers criados:     % (esperado: 20+)                              │', LPAD(v_triggers::text, 3);
  RAISE NOTICE '│ Políticas RLS:        % (esperado: 80+)                             │', LPAD(v_policies::text, 3);
  RAISE NOTICE '│ Storage Buckets:      % (esperado: 5)                                │', LPAD(v_buckets::text, 3);
  RAISE NOTICE '└─────────────────────────────────────────────────────────────────────────┘';
  RAISE NOTICE '';
  RAISE NOTICE '┌─────────────────────────────────────────────────────────────────────────┐';
  RAISE NOTICE '│ VERIFICAÇÕES CRÍTICAS                                                   │';
  RAISE NOTICE '├─────────────────────────────────────────────────────────────────────────┤';
  RAISE NOTICE '│ Configuração inicial:    %                                            │', CASE WHEN v_config_exists THEN '✅ OK    ' ELSE '❌ FALHOU' END;
  RAISE NOTICE '│ Trigger on_auth_user:    %                                            │', CASE WHEN v_user_trigger_exists THEN '✅ OK    ' ELSE '❌ FALHOU' END;
  RAISE NOTICE '└─────────────────────────────────────────────────────────────────────────┘';
  RAISE NOTICE '';
  
  IF NOT v_config_exists OR NOT v_user_trigger_exists THEN
    RAISE NOTICE '🔴 ATENÇÃO: Algumas verificações falharam!';
    RAISE NOTICE '   Revise os erros acima antes de continuar.';
  ELSE
    RAISE NOTICE '✅ BANCO DE DADOS CONFIGURADO COM SUCESSO!';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '┌─────────────────────────────────────────────────────────────────────────┐';
  RAISE NOTICE '│ PRÓXIMOS PASSOS                                                         │';
  RAISE NOTICE '├─────────────────────────────────────────────────────────────────────────┤';
  RAISE NOTICE '│ 1. Deploy Edge Functions (execute deploy-projeto-novo.sh)               │';
  RAISE NOTICE '│ 2. Configurar Secrets no Dashboard do Supabase                          │';
  RAISE NOTICE '│ 3. Criar primeiro usuário e promover a superadmin                       │';
  RAISE NOTICE '│ 4. (Opcional) Configurar cron jobs (script 04)                          │';
  RAISE NOTICE '└─────────────────────────────────────────────────────────────────────────┘';
  RAISE NOTICE '';
END $$;

-- =============================================================================
-- FIM DO SCRIPT UNIFICADO
-- =============================================================================
