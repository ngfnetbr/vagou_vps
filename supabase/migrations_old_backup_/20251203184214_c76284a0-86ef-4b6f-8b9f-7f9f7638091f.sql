-- Adicionar campo para configurar dias de antecedência para lembrete
ALTER TABLE public.configuracoes_sistema 
ADD COLUMN IF NOT EXISTS dias_antecedencia_lembrete integer DEFAULT 3;

-- Comentário para documentação
COMMENT ON COLUMN public.configuracoes_sistema.dias_antecedencia_lembrete IS 'Número de dias antes do prazo para enviar lembrete de convocação';