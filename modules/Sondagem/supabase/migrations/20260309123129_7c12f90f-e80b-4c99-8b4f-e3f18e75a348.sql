
-- Add columns first
ALTER TABLE public.local_criancas 
  ADD COLUMN IF NOT EXISTS responsavel text,
  ADD COLUMN IF NOT EXISTS telefone text;

-- Drop and recreate view with new columns
DROP VIEW IF EXISTS public.view_criancas_unificado;

CREATE VIEW public.view_criancas_unificado
WITH (security_invoker = true) AS
SELECT 
  id,
  nome,
  data_nascimento,
  turma_id,
  turma_nome,
  cmei_id,
  cmei_nome,
  ativo,
  'local'::text AS fonte,
  responsavel,
  telefone
FROM local_criancas
WHERE ativo = true
UNION ALL
SELECT 
  id,
  nome,
  data_nascimento,
  turma_id,
  turma_nome,
  cmei_id,
  cmei_nome,
  ativo,
  'cache'::text AS fonte,
  NULL::text AS responsavel,
  NULL::text AS telefone
FROM cache_criancas
WHERE ativo = true
  AND NOT EXISTS (
    SELECT 1 FROM local_criancas lc
    WHERE lc.nome = cache_criancas.nome
      AND lc.ativo = true
  );
