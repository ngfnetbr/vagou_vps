ALTER TABLE IF EXISTS public.configuracoes_sistema
ADD COLUMN IF NOT EXISTS habilitar_vagou boolean NOT NULL DEFAULT true;