DROP VIEW IF EXISTS view_criancas_unificado;

CREATE VIEW view_criancas_unificado AS
SELECT 
  id,
  nome,
  data_nascimento,
  turma_id,
  turma_nome,
  cmei_id,
  cmei_nome,
  ativo,
  responsavel,
  telefone,
  'cache'::text AS fonte
FROM cache_criancas
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
  responsavel,
  telefone,
  'local'::text AS fonte
FROM local_criancas
WHERE ativo = true
AND NOT EXISTS (
  SELECT 1 FROM cache_criancas cc 
  WHERE cc.nome = local_criancas.nome 
  AND cc.ativo = true
);