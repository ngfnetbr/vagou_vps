-- Adicionar coluna para favicon personalizado
ALTER TABLE public.configuracoes_sistema 
ADD COLUMN IF NOT EXISTS favicon_url text DEFAULT NULL;