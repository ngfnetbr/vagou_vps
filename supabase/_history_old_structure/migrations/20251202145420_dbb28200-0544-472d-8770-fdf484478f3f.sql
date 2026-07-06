-- Adicionar campos para personalização do sistema
ALTER TABLE public.configuracoes_sistema 
ADD COLUMN IF NOT EXISTS sistema_nome text DEFAULT 'VAGOU',
ADD COLUMN IF NOT EXISTS sistema_icone_url text;