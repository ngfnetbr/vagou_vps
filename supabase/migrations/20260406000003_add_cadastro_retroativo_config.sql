ALTER TABLE public.configuracoes_sistema
ADD COLUMN IF NOT EXISTS permitir_cadastro_retroativo_admin boolean NOT NULL DEFAULT false;

-- Recalcular posições apenas por segurança (não muda nada aqui)
SELECT public.recalcular_posicoes_fila();
