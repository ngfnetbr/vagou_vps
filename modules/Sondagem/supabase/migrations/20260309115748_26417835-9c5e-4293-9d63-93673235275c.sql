
-- Fix views to use security invoker
DROP VIEW IF EXISTS public.view_cmeis_unificado;
DROP VIEW IF EXISTS public.view_turmas_unificado;
DROP VIEW IF EXISTS public.view_criancas_unificado;

CREATE VIEW public.view_cmeis_unificado WITH (security_invoker = true) AS
SELECT cmei_id AS id, cmei_nome AS nome, 'cache' AS fonte
FROM public.cache_criancas
WHERE cmei_id IS NOT NULL AND cmei_nome IS NOT NULL AND ativo = true
GROUP BY cmei_id, cmei_nome
UNION ALL
SELECT id::text, nome, 'local' AS fonte
FROM public.local_cmeis
WHERE ativo = true
AND nome NOT IN (
  SELECT DISTINCT cmei_nome FROM public.cache_criancas WHERE cmei_nome IS NOT NULL AND ativo = true
);

CREATE VIEW public.view_turmas_unificado WITH (security_invoker = true) AS
SELECT turma_id AS id, turma_nome AS nome, cmei_id, cmei_nome, 'cache' AS fonte
FROM public.cache_criancas
WHERE turma_id IS NOT NULL AND turma_nome IS NOT NULL AND ativo = true
GROUP BY turma_id, turma_nome, cmei_id, cmei_nome
UNION ALL
SELECT id::text, nome, cmei_id, cmei_nome, 'local' AS fonte
FROM public.local_turmas
WHERE ativo = true
AND nome NOT IN (
  SELECT DISTINCT turma_nome FROM public.cache_criancas WHERE turma_nome IS NOT NULL AND ativo = true
);

CREATE VIEW public.view_criancas_unificado WITH (security_invoker = true) AS
SELECT id, nome, data_nascimento, turma_id, turma_nome, cmei_id, cmei_nome, ativo, 'cache' AS fonte
FROM public.cache_criancas
WHERE ativo = true
UNION ALL
SELECT id, nome, data_nascimento, turma_id, turma_nome, cmei_id, cmei_nome, ativo, 'local' AS fonte
FROM public.local_criancas
WHERE ativo = true
AND NOT EXISTS (
  SELECT 1 FROM public.cache_criancas cc
  WHERE cc.nome = local_criancas.nome
  AND cc.ativo = true
  AND (cc.data_nascimento = local_criancas.data_nascimento OR (cc.data_nascimento IS NULL AND local_criancas.data_nascimento IS NULL))
);
