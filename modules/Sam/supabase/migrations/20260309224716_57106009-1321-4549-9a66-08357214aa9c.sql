
CREATE OR REPLACE VIEW public.schools_unified AS
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
