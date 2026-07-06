
DROP VIEW IF EXISTS public.schools_unified;
CREATE VIEW public.schools_unified WITH (security_invoker=on) AS
SELECT id, name, address, active, created_at, 'local'::text AS source
FROM schools
UNION ALL
SELECT 
  gen_random_uuid() AS id,
  cmei_atual_nome AS name,
  NULL AS address,
  true AS active,
  now() AS created_at,
  'cache'::text AS source
FROM (
  SELECT DISTINCT cmei_atual_nome 
  FROM criancas_cache 
  WHERE cmei_atual_nome IS NOT NULL 
    AND deleted_at IS NULL
    AND cmei_atual_nome NOT IN (SELECT name FROM schools)
) sub;

-- Fix students_unified view too
DROP VIEW IF EXISTS public.students_unified;
CREATE VIEW public.students_unified WITH (security_invoker=on) AS
SELECT s.id,
    s.full_name AS nome,
    s.birth_date AS data_nascimento,
    sc.name AS cmei_atual_nome,
    s.class_name AS turma_atual_nome,
    s.guardian_name AS nome_responsavel,
    NULL::text AS responsavel_telefone,
    'local'::text AS source
   FROM students s
     LEFT JOIN schools sc ON sc.id = s.school_id
UNION ALL
 SELECT c.id,
    c.nome,
    c.data_nascimento,
    c.cmei_atual_nome,
    c.turma_atual_nome,
    c.nome_responsavel,
    c.responsavel_telefone,
    'cache'::text AS source
   FROM criancas_cache c
  WHERE c.deleted_at IS NULL AND NOT (EXISTS ( SELECT 1
           FROM students s
          WHERE s.id = c.id));
