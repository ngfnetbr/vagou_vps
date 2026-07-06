
CREATE OR REPLACE VIEW public.classes_unified WITH (security_invoker=on) AS
SELECT 
  sc.id,
  sc.name,
  sc.school_id,
  s.name AS school_name,
  sc.active,
  sc.created_at,
  'local'::text AS source
FROM school_classes sc
LEFT JOIN schools s ON s.id = sc.school_id
UNION ALL
SELECT
  gen_random_uuid() AS id,
  sub.turma_atual_nome AS name,
  NULL::uuid AS school_id,
  sub.cmei_atual_nome AS school_name,
  true AS active,
  now() AS created_at,
  'cache'::text AS source
FROM (
  SELECT DISTINCT turma_atual_nome, cmei_atual_nome
  FROM criancas_cache
  WHERE turma_atual_nome IS NOT NULL
    AND deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM school_classes sc
      JOIN schools s ON s.id = sc.school_id
      WHERE sc.name = criancas_cache.turma_atual_nome
        AND s.name = criancas_cache.cmei_atual_nome
    )
) sub;
