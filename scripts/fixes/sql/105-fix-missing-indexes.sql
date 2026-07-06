-- Fix 15 Unindexed Foreign Keys

CREATE INDEX IF NOT EXISTS idx_campos_inscricao_historico_campo_id ON public.campos_inscricao_historico(campo_id);

CREATE INDEX IF NOT EXISTS idx_criancas_cmei1_preferencia ON public.criancas(cmei1_preferencia);
CREATE INDEX IF NOT EXISTS idx_criancas_cmei2_preferencia ON public.criancas(cmei2_preferencia);
CREATE INDEX IF NOT EXISTS idx_criancas_cmei_atual_id ON public.criancas(cmei_atual_id);
CREATE INDEX IF NOT EXISTS idx_criancas_cmei_remanejamento_id ON public.criancas(cmei_remanejamento_id);
CREATE INDEX IF NOT EXISTS idx_criancas_turma_atual_id ON public.criancas(turma_atual_id);

CREATE INDEX IF NOT EXISTS idx_historico_cmei_anterior ON public.historico(cmei_anterior);
CREATE INDEX IF NOT EXISTS idx_historico_cmei_novo ON public.historico(cmei_novo);
CREATE INDEX IF NOT EXISTS idx_historico_crianca_id ON public.historico(crianca_id);
CREATE INDEX IF NOT EXISTS idx_historico_turma_anterior ON public.historico(turma_anterior);
CREATE INDEX IF NOT EXISTS idx_historico_turma_novo ON public.historico(turma_novo);

CREATE INDEX IF NOT EXISTS idx_planejamento_transicao_cmei_destino_id ON public.planejamento_transicao(cmei_destino_id);
CREATE INDEX IF NOT EXISTS idx_planejamento_transicao_turma_destino_id ON public.planejamento_transicao(turma_destino_id);

CREATE INDEX IF NOT EXISTS idx_tipos_prioridade_documento_tipo_id ON public.tipos_prioridade(documento_tipo_id);

CREATE INDEX IF NOT EXISTS idx_turmas_cmei_id ON public.turmas(cmei_id);
