-- Adiciona professores e auxiliares (com turno) por turma
ALTER TABLE public.turmas
ADD COLUMN IF NOT EXISTS professores jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS auxiliares jsonb NOT NULL DEFAULT '[]'::jsonb;

