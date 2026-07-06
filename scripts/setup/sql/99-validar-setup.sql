-- =============================================================================
-- VAGOU - Validação Completa do Setup
-- =============================================================================
-- Execute este script APÓS todos os outros scripts de setup para validar
-- que tudo foi configurado corretamente.
-- =============================================================================

DO $$
DECLARE
  v_success text[] := '{}';
  v_warnings text[] := '{}';
  v_errors text[] := '{}';
  v_info text[] := '{}';
  
  -- Contadores
  v_count integer;
  v_expected integer;
  v_missing text;
  
  -- Verificações de extensões
  v_uuid_ossp boolean;
  v_pg_cron boolean;
  v_pg_net boolean;
  
  -- Tabelas esperadas
  v_expected_tables text[] := ARRAY[
    'criancas', 'cmeis', 'turmas', 'turmas_base', 'historico',
    'profiles', 'user_roles', 'configuracoes_sistema',
    'notificacoes_log', 'templates_mensagens', 'documentos_crianca',
    'documentos_tipos', 'tipos_prioridade', 'crianca_prioridades',
    'chat_mensagens', 'chat_marcadores', 'chat_conversa_marcadores',
    'chat_conversas_config', 'chat_respostas_rapidas',
    'motivos_padrao', 'permissoes', 'role_permissoes',
    'campos_inscricao', 'campos_inscricao_historico',
    'zonas_atendimento', 'cmei_zonas', 'valores_campos_custom',
    'feriados_municipais', 'planejamento_transicao',
    'auditoria', 'rate_limit_entries', 'diretor_cmei_vinculo',
    'mensagens_status_custom', 'tutoriais_videos', 'tutorial_secoes',
    'tutorial_faq', 'tutorial_dicas'
  ];
  
  -- Funções esperadas
  v_expected_functions text[] := ARRAY[
    'has_role', 'is_admin', 'has_permission', 'handle_new_user',
    'update_updated_at_column', 'recalcular_posicoes_fila',
    'trigger_atualizar_posicao_fila', 'validar_cpf',
    'inserir_inscricao_publica', 'consulta_publica_por_cpf',
    'verificar_duplicidade_inscricao', 'get_fila_publica',
    'get_historico_fila_publico', 'get_ocupacao_cmeis',
    'get_ocupacao_turmas', 'get_public_configuracoes',
    'cleanup_old_rate_limits', 'link_children_by_cpf',
    'get_user_cmei_ids', 'director_has_cmei_access',
    'registrar_auditoria', 'audit_trigger_function',
    'check_turma_can_deactivate', 'registrar_historico_campos_inscricao'
  ];
  
  -- Triggers esperados
  v_expected_triggers text[] := ARRAY[
    'on_auth_user_created',
    'trigger_recalcular_fila',
    'update_criancas_updated_at',
    'update_cmeis_updated_at',
    'update_turmas_updated_at',
    'update_profiles_updated_at',
    'update_configuracoes_sistema_updated_at',
    'check_turma_deactivate',
    'trigger_historico_campos_inscricao'
  ];
  
  -- ENUMs esperados
  v_expected_enums text[] := ARRAY[
    'app_role', 'status_crianca', 'prioridade_tipo', 'sexo_tipo'
  ];
  
  -- Tabelas para Realtime
  v_realtime_tables text[] := ARRAY[
    'criancas', 'historico', 'chat_mensagens', 'notificacoes_log',
    'configuracoes_sistema', 'auditoria', 'turmas', 'cmeis',
    'documentos_crianca', 'crianca_prioridades'
  ];
  
  tbl text;
  func text;
  trig text;
  enum_name text;
  
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║           VAGOU - VALIDAÇÃO COMPLETA DO SETUP                ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';

  -- =========================================================================
  -- 1. VERIFICAR EXTENSÕES
  -- =========================================================================
  RAISE NOTICE '📦 VERIFICANDO EXTENSÕES...';
  
  SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') INTO v_uuid_ossp;
  SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') INTO v_pg_cron;
  SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_net') INTO v_pg_net;
  
  IF v_uuid_ossp THEN
    v_success := array_append(v_success, 'Extensão uuid-ossp habilitada');
  ELSE
    v_errors := array_append(v_errors, 'Extensão uuid-ossp NÃO habilitada (CRÍTICO)');
  END IF;
  
  IF v_pg_cron THEN
    v_success := array_append(v_success, 'Extensão pg_cron habilitada');
  ELSE
    v_warnings := array_append(v_warnings, 'Extensão pg_cron NÃO habilitada (necessária para automação)');
  END IF;
  
  IF v_pg_net THEN
    v_success := array_append(v_success, 'Extensão pg_net habilitada');
  ELSE
    v_warnings := array_append(v_warnings, 'Extensão pg_net NÃO habilitada (necessária para webhooks em cron)');
  END IF;

  -- =========================================================================
  -- 2. VERIFICAR TABELAS
  -- =========================================================================
  RAISE NOTICE '📋 VERIFICANDO TABELAS...';
  
  v_missing := '';
  FOREACH tbl IN ARRAY v_expected_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      v_missing := v_missing || tbl || ', ';
    END IF;
  END LOOP;
  
  SELECT COUNT(*) INTO v_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  
  IF v_missing = '' THEN
    v_success := array_append(v_success, format('Todas as %s tabelas esperadas existem', array_length(v_expected_tables, 1)));
  ELSE
    v_errors := array_append(v_errors, 'Tabelas faltando: ' || rtrim(v_missing, ', '));
  END IF;
  
  v_info := array_append(v_info, format('Total de tabelas no schema public: %s', v_count));

  -- =========================================================================
  -- 3. VERIFICAR FUNÇÕES
  -- =========================================================================
  RAISE NOTICE '⚙️ VERIFICANDO FUNÇÕES...';
  
  v_missing := '';
  FOREACH func IN ARRAY v_expected_functions
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = func
    ) THEN
      v_missing := v_missing || func || ', ';
    END IF;
  END LOOP;
  
  SELECT COUNT(DISTINCT p.proname) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public';
  
  IF v_missing = '' THEN
    v_success := array_append(v_success, format('Todas as %s funções esperadas existem', array_length(v_expected_functions, 1)));
  ELSE
    v_errors := array_append(v_errors, 'Funções faltando: ' || rtrim(v_missing, ', '));
  END IF;
  
  v_info := array_append(v_info, format('Total de funções no schema public: %s', v_count));

  -- =========================================================================
  -- 4. VERIFICAR TRIGGERS
  -- =========================================================================
  RAISE NOTICE '🔔 VERIFICANDO TRIGGERS...';
  
  v_missing := '';
  FOREACH trig IN ARRAY v_expected_triggers
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      WHERE t.tgname = trig
    ) THEN
      v_missing := v_missing || trig || ', ';
    END IF;
  END LOOP;
  
  SELECT COUNT(*) INTO v_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND NOT t.tgisinternal;
  
  IF v_missing = '' THEN
    v_success := array_append(v_success, format('Todos os %s triggers esperados existem', array_length(v_expected_triggers, 1)));
  ELSE
    v_warnings := array_append(v_warnings, 'Triggers faltando: ' || rtrim(v_missing, ', '));
  END IF;
  
  -- Verificar trigger crítico de auth
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    v_success := array_append(v_success, 'Trigger on_auth_user_created (auth.users) configurado');
  ELSE
    v_errors := array_append(v_errors, 'Trigger on_auth_user_created NÃO existe (CRÍTICO - usuários não terão profile/role)');
  END IF;
  
  v_info := array_append(v_info, format('Total de triggers: %s', v_count));

  -- =========================================================================
  -- 5. VERIFICAR ENUMs
  -- =========================================================================
  RAISE NOTICE '🏷️ VERIFICANDO ENUMs...';
  
  v_missing := '';
  FOREACH enum_name IN ARRAY v_expected_enums
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_type t
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE n.nspname = 'public' AND t.typname = enum_name AND t.typtype = 'e'
    ) THEN
      v_missing := v_missing || enum_name || ', ';
    END IF;
  END LOOP;
  
  IF v_missing = '' THEN
    v_success := array_append(v_success, format('Todos os %s ENUMs esperados existem', array_length(v_expected_enums, 1)));
  ELSE
    v_errors := array_append(v_errors, 'ENUMs faltando: ' || rtrim(v_missing, ', '));
  END IF;
  
  -- Verificar valor 'Remanejamento' no ENUM prioridade_tipo
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public' AND t.typname = 'prioridade_tipo' AND e.enumlabel = 'Remanejamento'
  ) THEN
    v_success := array_append(v_success, 'ENUM prioridade_tipo contém valor Remanejamento');
  ELSE
    v_warnings := array_append(v_warnings, 'ENUM prioridade_tipo NÃO contém valor Remanejamento (pode causar erros)');
  END IF;

  -- =========================================================================
  -- 6. VERIFICAR RLS
  -- =========================================================================
  RAISE NOTICE '🔒 VERIFICANDO ROW LEVEL SECURITY...';
  
  SELECT COUNT(*) INTO v_count
  FROM pg_tables t
  WHERE t.schemaname = 'public'
    AND NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public' AND c.relname = t.tablename AND c.relrowsecurity = true
    );
  
  IF v_count = 0 THEN
    v_success := array_append(v_success, 'RLS habilitado em todas as tabelas');
  ELSE
    v_warnings := array_append(v_warnings, format('%s tabelas sem RLS habilitado', v_count));
  END IF;
  
  SELECT COUNT(*) INTO v_count FROM pg_policies WHERE schemaname = 'public';
  v_info := array_append(v_info, format('Total de políticas RLS: %s', v_count));

  -- =========================================================================
  -- 7. VERIFICAR DADOS INICIAIS
  -- =========================================================================
  RAISE NOTICE '📊 VERIFICANDO DADOS INICIAIS...';
  
  -- Configurações do sistema
  SELECT COUNT(*) INTO v_count FROM configuracoes_sistema;
  IF v_count > 0 THEN
    v_success := array_append(v_success, 'Configurações do sistema inseridas');
  ELSE
    v_errors := array_append(v_errors, 'Configurações do sistema NÃO inseridas');
  END IF;
  
  -- Turmas base
  SELECT COUNT(*) INTO v_count FROM turmas_base;
  IF v_count >= 4 THEN
    v_success := array_append(v_success, format('Turmas base inseridas (%s)', v_count));
  ELSE
    v_warnings := array_append(v_warnings, format('Apenas %s turmas base (esperado >= 4)', v_count));
  END IF;
  
  -- Tipos de documento
  SELECT COUNT(*) INTO v_count FROM documentos_tipos;
  IF v_count >= 3 THEN
    v_success := array_append(v_success, format('Tipos de documento inseridos (%s)', v_count));
  ELSE
    v_warnings := array_append(v_warnings, format('Apenas %s tipos de documento (esperado >= 3)', v_count));
  END IF;
  
  -- Tipos de prioridade
  SELECT COUNT(*) INTO v_count FROM tipos_prioridade;
  IF v_count >= 2 THEN
    v_success := array_append(v_success, format('Tipos de prioridade inseridos (%s)', v_count));
  ELSE
    v_warnings := array_append(v_warnings, format('Apenas %s tipos de prioridade (esperado >= 2)', v_count));
  END IF;
  
  -- Templates de mensagem
  SELECT COUNT(*) INTO v_count FROM templates_mensagens;
  IF v_count >= 5 THEN
    v_success := array_append(v_success, format('Templates de mensagem inseridos (%s)', v_count));
  ELSE
    v_warnings := array_append(v_warnings, format('Apenas %s templates (esperado >= 5)', v_count));
  END IF;
  
  -- Permissões
  SELECT COUNT(*) INTO v_count FROM permissoes;
  IF v_count >= 34 THEN
    v_success := array_append(v_success, format('Permissões inseridas (%s)', v_count));
  ELSIF v_count >= 10 THEN
    v_warnings := array_append(v_warnings, format('Permissões parciais (%s de 34 esperadas)', v_count));
  ELSE
    v_errors := array_append(v_errors, format('Apenas %s permissões (esperado >= 34)', v_count));
  END IF;
  
  -- Verificar permissões específicas de remanejamento
  IF EXISTS (SELECT 1 FROM permissoes WHERE codigo = 'remanejamento.aprovar') THEN
    v_success := array_append(v_success, 'Permissões de remanejamento configuradas');
  ELSE
    v_warnings := array_append(v_warnings, 'Permissões de remanejamento faltando (remanejamento.aprovar, etc)');
  END IF;
  
  -- Campos de inscrição
  SELECT COUNT(*) INTO v_count FROM campos_inscricao;
  IF v_count >= 10 THEN
    v_success := array_append(v_success, format('Campos de inscrição inseridos (%s)', v_count));
  ELSE
    v_warnings := array_append(v_warnings, format('Apenas %s campos de inscrição (esperado >= 10)', v_count));
  END IF;

  -- =========================================================================
  -- 8. VERIFICAR CRON JOBS (se pg_cron habilitado)
  -- =========================================================================
  RAISE NOTICE '⏰ VERIFICANDO CRON JOBS...';
  
  IF v_pg_cron THEN
    -- Verificar job de verificação de prazos
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'verificar-prazos-diario') THEN
      v_success := array_append(v_success, 'Cron job verificar-prazos-diario configurado');
    ELSE
      v_warnings := array_append(v_warnings, 'Cron job verificar-prazos-diario NÃO configurado');
    END IF;
    
    -- Verificar job de limpeza de rate limits (CRÍTICO!)
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'limpar-rate-limits-hora') THEN
      v_success := array_append(v_success, 'Cron job limpar-rate-limits-hora configurado');
    ELSE
      v_errors := array_append(v_errors, 'Cron job limpar-rate-limits-hora NÃO configurado (CRÍTICO - tabela rate_limit_entries crescerá indefinidamente)');
    END IF;
    
    SELECT COUNT(*) INTO v_count FROM cron.job;
    v_info := array_append(v_info, format('Total de cron jobs: %s', v_count));
  ELSE
    v_info := array_append(v_info, 'pg_cron não habilitado - verificação de cron jobs ignorada');
  END IF;

  -- =========================================================================
  -- 9. VERIFICAR REALTIME
  -- =========================================================================
  RAISE NOTICE '📡 VERIFICANDO REALTIME...';
  
  v_missing := '';
  FOREACH tbl IN ARRAY v_realtime_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
    ) THEN
      v_missing := v_missing || tbl || ', ';
    END IF;
  END LOOP;
  
  SELECT COUNT(*) INTO v_count
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime' AND schemaname = 'public';
  
  IF v_missing = '' THEN
    v_success := array_append(v_success, format('Todas as %s tabelas de Realtime configuradas', array_length(v_realtime_tables, 1)));
  ELSE
    v_warnings := array_append(v_warnings, 'Tabelas faltando no Realtime: ' || rtrim(v_missing, ', '));
  END IF;
  
  v_info := array_append(v_info, format('Total de tabelas no Realtime: %s', v_count));

  -- =========================================================================
  -- 10. VERIFICAR SUPER ADMIN
  -- =========================================================================
  RAISE NOTICE '👑 VERIFICANDO SUPER ADMIN...';
  
  IF EXISTS (SELECT 1 FROM user_roles WHERE role = 'superadmin') THEN
    v_success := array_append(v_success, 'Super admin configurado');
  ELSE
    v_warnings := array_append(v_warnings, 'Nenhum super admin configurado (execute script 05)');
  END IF;

  -- =========================================================================
  -- 11. VERIFICAR CONFIGURAÇÕES DO MUNICÍPIO
  -- =========================================================================
  RAISE NOTICE '🏛️ VERIFICANDO CONFIGURAÇÕES DO MUNICÍPIO...';
  
  IF EXISTS (
    SELECT 1 FROM configuracoes_sistema 
    WHERE nome_municipio IS NOT NULL AND nome_municipio != 'Município'
  ) THEN
    v_success := array_append(v_success, 'Nome do município configurado');
  ELSE
    v_warnings := array_append(v_warnings, 'Nome do município não personalizado');
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM configuracoes_sistema 
    WHERE brasao_url IS NOT NULL AND brasao_url != ''
  ) THEN
    v_success := array_append(v_success, 'Brasão do município configurado');
  ELSE
    v_info := array_append(v_info, 'Brasão do município não configurado (opcional)');
  END IF;

  -- =========================================================================
  -- RELATÓRIO FINAL
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════════════════';
  RAISE NOTICE '                      RELATÓRIO FINAL';
  RAISE NOTICE '══════════════════════════════════════════════════════════════';
  
  -- Sucessos
  IF array_length(v_success, 1) > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SUCESSO (%s itens):', array_length(v_success, 1);
    FOR i IN 1..array_length(v_success, 1) LOOP
      RAISE NOTICE '   • %', v_success[i];
    END LOOP;
  END IF;
  
  -- Warnings
  IF array_length(v_warnings, 1) > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ AVISOS (%s itens):', array_length(v_warnings, 1);
    FOR i IN 1..array_length(v_warnings, 1) LOOP
      RAISE NOTICE '   • %', v_warnings[i];
    END LOOP;
  END IF;
  
  -- Erros
  IF array_length(v_errors, 1) > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ ERROS (%s itens):', array_length(v_errors, 1);
    FOR i IN 1..array_length(v_errors, 1) LOOP
      RAISE NOTICE '   • %', v_errors[i];
    END LOOP;
  END IF;
  
  -- Info
  IF array_length(v_info, 1) > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE 'ℹ️ INFORMAÇÕES:';
    FOR i IN 1..array_length(v_info, 1) LOOP
      RAISE NOTICE '   • %', v_info[i];
    END LOOP;
  END IF;
  
  -- Status geral
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════════════════';
  
  IF array_length(v_errors, 1) > 0 THEN
    RAISE NOTICE '🔴 STATUS: FALHOU - Corrija os erros acima antes de prosseguir';
  ELSIF array_length(v_warnings, 1) > 0 THEN
    RAISE NOTICE '🟡 STATUS: PARCIAL - Sistema funcional, mas revise os avisos';
  ELSE
    RAISE NOTICE '🟢 STATUS: SUCESSO - Todas as verificações passaram!';
  END IF;
  
  RAISE NOTICE '══════════════════════════════════════════════════════════════';
  
  -- Próximos passos se houver problemas
  IF array_length(v_errors, 1) > 0 OR array_length(v_warnings, 1) > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '📋 PRÓXIMOS PASSOS:';
    
    IF NOT v_pg_cron THEN
      RAISE NOTICE '   1. Habilite pg_cron: Dashboard > Database > Extensions';
    END IF;
    
    IF NOT v_pg_net THEN
      RAISE NOTICE '   2. Habilite pg_net: Dashboard > Database > Extensions';
    END IF;
    
    IF v_pg_cron AND NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'limpar-rate-limits-hora') THEN
      RAISE NOTICE '   3. Configure cron jobs: Execute PARTE 4 do script 04-setup-automacao.sql';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM user_roles WHERE role = 'superadmin') THEN
      RAISE NOTICE '   4. Crie super admin: Execute script 05-setup-superadmin.sql';
    END IF;
  END IF;
  
  RAISE NOTICE '';
END $$;

-- =============================================================================
-- VERIFICAÇÃO ADICIONAL: STORAGE BUCKETS
-- =============================================================================

SELECT 
  '📦 STORAGE BUCKETS' as categoria,
  COUNT(*) as total,
  string_agg(name, ', ') as buckets
FROM storage.buckets;

-- Verificar buckets esperados
SELECT 
  CASE 
    WHEN COUNT(*) >= 5 THEN '✅ Buckets de storage configurados corretamente (5/5)'
    WHEN COUNT(*) >= 4 THEN '⚠️ Buckets parciais: ' || COUNT(*)::text || '/5 (falta chat-arquivos?)'
    ELSE '❌ Faltam buckets: esperado 5, encontrado ' || COUNT(*)::text
  END as status_buckets
FROM storage.buckets
WHERE name IN ('brasoes', 'avatars', 'assets', 'documentos', 'chat-arquivos');

-- Listar buckets existentes vs esperados
SELECT 
  name as bucket_existente,
  CASE WHEN name IN ('brasoes', 'avatars', 'assets', 'documentos', 'chat-arquivos') 
       THEN '✅ Esperado' ELSE '➕ Extra' END as status
FROM storage.buckets
ORDER BY name;

-- =============================================================================
-- RESUMO DE OBJETOS CRIADOS
-- =============================================================================

SELECT '📊 RESUMO FINAL' as titulo;

SELECT 
  'Tabelas' as tipo,
  COUNT(*) as quantidade
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'

UNION ALL

SELECT 
  'Funções' as tipo,
  COUNT(DISTINCT proname) as quantidade
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'

UNION ALL

SELECT 
  'Triggers' as tipo,
  COUNT(*) as quantidade
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname IN ('public', 'auth') AND NOT t.tgisinternal

UNION ALL

SELECT 
  'Tabelas com RLS' as tipo,
  COUNT(*) as quantidade
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = true

UNION ALL

SELECT 
  'Políticas RLS' as tipo,
  COUNT(*) as quantidade
FROM pg_policies
WHERE schemaname = 'public';
