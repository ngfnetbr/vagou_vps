-- =============================================================================
-- VAGOU - Índices de Performance Recomendados
-- =============================================================================
-- Baseado na análise das políticas RLS e chaves estrangeiras
-- =============================================================================

-- 1. Índices para RLS de Responsáveis (crítico para performance do dashboard dos pais)
CREATE INDEX IF NOT EXISTS idx_criancas_responsavel_user_id ON public.criancas(responsavel_user_id);

-- 2. Índices para Joins de Tabelas Relacionadas à Criança
-- Usados frequentemente em subqueries de RLS (EXISTS ...)
CREATE INDEX IF NOT EXISTS idx_historico_crianca_id ON public.historico(crianca_id);
CREATE INDEX IF NOT EXISTS idx_documentos_crianca_crianca_id ON public.documentos_crianca(crianca_id);
CREATE INDEX IF NOT EXISTS idx_crianca_prioridades_crianca_id ON public.crianca_prioridades(crianca_id);
CREATE INDEX IF NOT EXISTS idx_valores_campos_custom_crianca_id ON public.valores_campos_custom(crianca_id);

-- 3. Índices para Consultas Públicas e Listagens (filtragem por status/ativo)
CREATE INDEX IF NOT EXISTS idx_cmeis_ativo ON public.cmeis(ativo);
CREATE INDEX IF NOT EXISTS idx_turmas_ativo ON public.turmas(ativo);
CREATE INDEX IF NOT EXISTS idx_criancas_status ON public.criancas(status);

-- 4. Índices para Chaves Estrangeiras (evita table scans em deletes e joins)
CREATE INDEX IF NOT EXISTS idx_criancas_cmei_atual ON public.criancas(cmei_atual_id);
CREATE INDEX IF NOT EXISTS idx_criancas_turma_atual ON public.criancas(turma_atual_id);
CREATE INDEX IF NOT EXISTS idx_turmas_cmei_id ON public.turmas(cmei_id);
