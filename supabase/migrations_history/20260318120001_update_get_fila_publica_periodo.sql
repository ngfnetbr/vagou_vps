DROP FUNCTION IF EXISTS public.get_fila_publica();

CREATE FUNCTION public.get_fila_publica()
RETURNS TABLE(
  id uuid,
  nome text,
  data_nascimento date,
  sexo text,
  status text,
  posicao_fila integer,
  prioridade text,
  programas_sociais boolean,
  created_at timestamp with time zone,
  cmei1_nome text,
  cmei2_nome text,
  responsavel_nome text,
  convocacao_deadline date,
  cmei_remanejamento_id uuid,
  cmei_remanejamento_nome text,
  periodo text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    c.id,
    (SELECT string_agg(substr(word, 1, 1) || '.', '')
     FROM unnest(string_to_array(c.nome, ' ')) AS word
     WHERE word <> '') as nome,
    c.data_nascimento,
    c.sexo::text,
    c.status::text,
    c.posicao_fila,
    c.prioridade::text,
    c.programas_sociais,
    c.created_at,
    cmei1.nome as cmei1_nome,
    cmei2.nome as cmei2_nome,
    (SELECT string_agg(substr(word, 1, 1) || '.', '')
     FROM unnest(string_to_array(c.responsavel_nome, ' ')) AS word
     WHERE word <> '') as responsavel_nome,
    c.convocacao_deadline,
    c.cmei_remanejamento_id,
    cmei_remanejamento.nome as cmei_remanejamento_nome,
    (
      SELECT v.valor
      FROM valores_campos_custom v
      JOIN campos_inscricao ci ON ci.id = v.campo_id
      WHERE v.crianca_id = c.id
        AND ci.ativo = true
        AND (
          ci.nome_campo ILIKE '%turno%'
          OR ci.label ILIKE '%turno%'
          OR ci.nome_campo ILIKE '%period%'
          OR ci.label ILIKE '%periodo%'
          OR ci.label ILIKE '%período%'
        )
        AND v.valor IS NOT NULL
        AND btrim(v.valor) <> ''
      ORDER BY
        CASE
          WHEN lower(ci.nome_campo) = 'turno' THEN 0
          WHEN lower(ci.nome_campo) LIKE '%turno%' THEN 1
          WHEN lower(ci.nome_campo) LIKE '%period%' THEN 2
          WHEN lower(ci.label) LIKE '%turno%' THEN 3
          WHEN lower(ci.label) LIKE '%período%' OR lower(ci.label) LIKE '%periodo%' OR lower(ci.label) LIKE '%period%' THEN 4
          ELSE 9
        END,
        ci.ordem ASC
      LIMIT 1
    ) as periodo
  FROM criancas c
  LEFT JOIN cmeis cmei1 ON c.cmei1_preferencia = cmei1.id
  LEFT JOIN cmeis cmei2 ON c.cmei2_preferencia = cmei2.id
  LEFT JOIN cmeis cmei_remanejamento ON c.cmei_remanejamento_id = cmei_remanejamento.id
  WHERE c.status IN ('Fila de Espera', 'Convocado')
  ORDER BY 
    CASE WHEN c.status = 'Convocado' THEN 0 ELSE 1 END ASC,
    c.posicao_fila ASC NULLS LAST,
    COALESCE(c.data_retorno_fila, c.created_at) ASC
$$;
