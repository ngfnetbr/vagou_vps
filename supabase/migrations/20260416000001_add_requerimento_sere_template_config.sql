ALTER TABLE public.configuracoes_sistema
ADD COLUMN IF NOT EXISTS requerimento_sere_template_config jsonb NOT NULL DEFAULT '{}'::jsonb;

