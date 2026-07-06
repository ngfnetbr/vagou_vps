-- Adicionar campos para personalização visual do sistema
ALTER TABLE public.configuracoes_sistema 
ADD COLUMN IF NOT EXISTS tema_cor_primaria text DEFAULT '#1351B4',
ADD COLUMN IF NOT EXISTS tema_cor_secundaria text DEFAULT '#071D41',
ADD COLUMN IF NOT EXISTS tema_fonte text DEFAULT 'Inter';