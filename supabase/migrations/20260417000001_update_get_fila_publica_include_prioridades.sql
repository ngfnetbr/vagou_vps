DROP FUNCTION IF EXISTS public.get_fila_publica();

CREATE FUNCTION public.get_fila_publica()
RETURNS TABLE(
  id uuid,
  nome text,
  data_nascimento date,
  sexo text,
  status text,
  posicao_fila integer,
  posicao_fila_cmei2 integer,
  posicao_fila_cmei3 integer,
  prioridade text,
  programas_sociais boolean,
  pontos_base_fila integer,
  pontos_prioridades integer,
  pontos_programas_sociais integer,
  pontos_remanejamento integer,
  pontos_data_cadastro integer,
  bonus_zona_cmei1 integer,
  bonus_zona_cmei2 integer,
  bonus_zona_cmei3 integer,
  score_cmei1 integer,
  score_cmei2 integer,
  score_cmei3 integer,
  created_at timestamp with time zone,
  data_retorno_fila timestamp with time zone,
  cmei1_preferencia uuid,
  cmei2_preferencia uuid,
  cmei3_preferencia uuid,
  cmei1_nome text,
  cmei2_nome text,
  cmei3_nome text,
  responsavel_nome text,
  convocacao_deadline date,
  cmei_remanejamento_id uuid,
  cmei_remanejamento_nome text,
  periodo text,
  crianca_prioridades jsonb
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
    c.posicao_fila_cmei2,
    c.posicao_fila_cmei3,
    c.prioridade::text,
    c.programas_sociais,
    c.pontos_base_fila,
    c.pontos_prioridades,
    c.pontos_programas_sociais,
    c.pontos_remanejamento,
    c.pontos_data_cadastro,
    c.bonus_zona_cmei1,
    c.bonus_zona_cmei2,
    c.bonus_zona_cmei3,
    c.score_cmei1,
    c.score_cmei2,
    c.score_cmei3,
    c.created_at,
    c.data_retorno_fila,
    c.cmei1_preferencia,
    c.cmei2_preferencia,
    c.cmei3_preferencia,
    cmei1.nome as cmei1_nome,
    cmei2.nome as cmei2_nome,
    cmei3.nome as cmei3_nome,
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
    ) as periodo,
    (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'status', cp.status,
            'prioridade', jsonb_build_object(
              'id', tp.id,
              'nome', tp.nome,
              'codigo', tp.codigo,
              'peso', tp.peso
            )
          )
          ORDER BY tp.peso DESC NULLS LAST, tp.nome
        ),
        '[]'::jsonb
      )
      FROM public.crianca_prioridades cp
      JOIN public.tipos_prioridade tp ON tp.id = cp.prioridade_id
      WHERE cp.crianca_id = c.id
        AND tp.ativo = true
    ) AS crianca_prioridades
  FROM criancas c
  LEFT JOIN cmeis cmei1 ON c.cmei1_preferencia = cmei1.id
  LEFT JOIN cmeis cmei2 ON c.cmei2_preferencia = cmei2.id
  LEFT JOIN cmeis cmei3 ON c.cmei3_preferencia = cmei3.id
  LEFT JOIN cmeis cmei_remanejamento ON c.cmei_remanejamento_id = cmei_remanejamento.id
  WHERE c.status IN ('Fila de Espera', 'Convocado')
  ORDER BY 
    CASE WHEN c.status = 'Convocado' THEN 0 ELSE 1 END ASC,
    c.posicao_fila ASC NULLS LAST,
    COALESCE(c.data_retorno_fila, c.created_at) ASC
$$;
