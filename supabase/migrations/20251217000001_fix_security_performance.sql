-- =============================================================================
-- VAGOU - Correções de Segurança e Performance
-- =============================================================================
-- Data: 17/12/2025
-- Descrição: 
--   1. Corrige funções SQL com search_path mutável (segurança)
--   2. Adiciona índices em foreign keys mais usadas (performance)
-- =============================================================================

-- =============================================================================
-- PARTE 1: CORREÇÃO DE SEGURANÇA - Funções com search_path mutável
-- =============================================================================

-- Corrige fix_latin1_encoding (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fix_latin1_encoding' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER FUNCTION public.fix_latin1_encoding(text) SET search_path = public;
    RAISE NOTICE 'Função fix_latin1_encoding corrigida';
  END IF;
END $$;

-- Corrige fix_mojibake (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fix_mojibake' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER FUNCTION public.fix_mojibake(text) SET search_path = public;
    RAISE NOTICE 'Função fix_mojibake corrigida';
  END IF;
END $$;

-- Corrige fix_tutorial_json_content (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fix_tutorial_json_content' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER FUNCTION public.fix_tutorial_json_content(jsonb) SET search_path = public;
    RAISE NOTICE 'Função fix_tutorial_json_content corrigida';
  END IF;
END $$;

-- =============================================================================
-- PARTE 2: PERFORMANCE - Índices em Foreign Keys mais usadas
-- =============================================================================

-- Auditoria
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_id ON public.auditoria(usuario_id) WHERE usuario_id IS NOT NULL;

-- Crianças (FKs mais consultadas)
CREATE INDEX IF NOT EXISTS idx_criancas_responsavel_user_id ON public.criancas(responsavel_user_id) WHERE responsavel_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_criancas_created_by ON public.criancas(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_criancas_updated_by ON public.criancas(updated_by) WHERE updated_by IS NOT NULL;

-- Histórico
CREATE INDEX IF NOT EXISTS idx_historico_usuario_id ON public.historico(usuario_id) WHERE usuario_id IS NOT NULL;

-- Documentos Criança
CREATE INDEX IF NOT EXISTS idx_documentos_crianca_enviado_por ON public.documentos_crianca(enviado_por) WHERE enviado_por IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documentos_crianca_tipo_documento_id ON public.documentos_crianca(tipo_documento_id);

-- Chat Mensagens
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_enviado_por ON public.chat_mensagens(enviado_por) WHERE enviado_por IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_lida_por ON public.chat_mensagens(lida_por) WHERE lida_por IS NOT NULL;

-- Chat Marcadores
CREATE INDEX IF NOT EXISTS idx_chat_marcadores_created_by ON public.chat_marcadores(created_by) WHERE created_by IS NOT NULL;

-- Chat Conversa Marcadores
CREATE INDEX IF NOT EXISTS idx_chat_conversa_marcadores_created_by ON public.chat_conversa_marcadores(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_conversa_marcadores_marcador_id ON public.chat_conversa_marcadores(marcador_id);

-- Chat Respostas Rápidas
CREATE INDEX IF NOT EXISTS idx_chat_respostas_rapidas_created_by ON public.chat_respostas_rapidas(created_by) WHERE created_by IS NOT NULL;

-- CMEI Zonas
CREATE INDEX IF NOT EXISTS idx_cmei_zonas_zona_id ON public.cmei_zonas(zona_id);

-- Criança Prioridades
CREATE INDEX IF NOT EXISTS idx_crianca_prioridades_prioridade_id ON public.crianca_prioridades(prioridade_id);

-- Diretor CMEI Vínculo
CREATE INDEX IF NOT EXISTS idx_diretor_cmei_vinculo_cmei_id ON public.diretor_cmei_vinculo(cmei_id);
CREATE INDEX IF NOT EXISTS idx_diretor_cmei_vinculo_created_by ON public.diretor_cmei_vinculo(created_by) WHERE created_by IS NOT NULL;

-- Role Permissões
CREATE INDEX IF NOT EXISTS idx_role_permissoes_permissao_id ON public.role_permissoes(permissao_id);

-- Tutorial
CREATE INDEX IF NOT EXISTS idx_tutorial_dicas_created_by ON public.tutorial_dicas(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tutorial_faq_created_by ON public.tutorial_faq(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tutorial_secoes_created_by ON public.tutorial_secoes(created_by) WHERE created_by IS NOT NULL;

-- User Roles
CREATE INDEX IF NOT EXISTS idx_user_roles_created_by ON public.user_roles(created_by) WHERE created_by IS NOT NULL;

-- Valores Campos Custom
CREATE INDEX IF NOT EXISTS idx_valores_campos_custom_campo_id ON public.valores_campos_custom(campo_id);

-- Tipos Prioridade
CREATE INDEX IF NOT EXISTS idx_tipos_prioridade_documento_tipo_id ON public.tipos_prioridade(documento_tipo_id) WHERE documento_tipo_id IS NOT NULL;

-- =============================================================================
-- PARTE 3: COMENTÁRIOS E DOCUMENTAÇÃO
-- =============================================================================

COMMENT ON INDEX idx_auditoria_usuario_id IS 'Melhora performance de queries que filtram auditoria por usuário';
COMMENT ON INDEX idx_criancas_responsavel_user_id IS 'Melhora performance de queries que buscam crianças por responsável';
COMMENT ON INDEX idx_historico_usuario_id IS 'Melhora performance de queries que filtram histórico por usuário';

