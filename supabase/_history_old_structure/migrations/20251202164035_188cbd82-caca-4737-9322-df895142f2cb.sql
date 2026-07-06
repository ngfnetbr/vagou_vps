-- Adicionar novos campos de controle de acesso à tabela configuracoes_sistema
ALTER TABLE public.configuracoes_sistema
ADD COLUMN IF NOT EXISTS limite_inscricoes_responsavel integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS validar_cep boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ceps_permitidos text[] DEFAULT '{}';