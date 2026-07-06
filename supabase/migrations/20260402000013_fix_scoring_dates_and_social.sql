ALTER TABLE public.configuracoes_sistema
ADD COLUMN IF NOT EXISTS peso_programas_sociais integer NOT NULL DEFAULT 50;

CREATE OR REPLACE FUNCTION public.recalcular_posicoes_fila()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  WITH configuracoes AS (
    SELECT 
      prioridade_social_habilitada,
      prioridade_remanejamento_habilitada,
      prioridade_zona_habilitada,
      prioridade_zona_bonus_dentro,
      prioridade_zona_bonus_fora,
      peso_programas_sociais,
      peso_data_cadastro
    FROM public.configuracoes_sistema
    LIMIT 1
  ),
  prioridades_somadas AS (
    SELECT 
      cp.crianca_id,
      SUM(tp.peso)::int AS pontos_prioridades
    FROM public.crianca_prioridades cp
    JOIN public.tipos_prioridade tp ON tp.id = cp.prioridade_id
    CROSS JOIN configuracoes cfg
    WHERE cp.status = 'aprovado'
      AND tp.ativo = true
      AND (tp.codigo <> 'social' OR cfg.prioridade_social_habilitada = true)
    GROUP BY cp.crianca_id
  ),
  pontos_sociais AS (
    SELECT
      c.id AS crianca_id,
      CASE
        WHEN cfg.prioridade_social_habilitada
          AND c.programas_sociais = true
          AND c.data_penalidade IS NULL
        THEN cfg.peso_programas_sociais
        ELSE 0
      END::int AS pontos_programas_sociais
    FROM public.criancas c
    CROSS JOIN configuracoes cfg
  ),
  prioridade_remanejamento AS (
    SELECT 
      c.id as crianca_id,
      CASE 
        WHEN cfg.prioridade_remanejamento_habilitada AND c.prioridade = 'Remanejamento' THEN 100
        ELSE 0
      END::int as pontos_remanejamento
    FROM public.criancas c
    CROSS JOIN configuracoes cfg
  ),
  bonus_zona AS (
    SELECT
      c.id AS crianca_id,
      CASE
        WHEN cfg.prioridade_zona_habilitada
          AND c.zona_atendimento_id IS NOT NULL
          AND c.cmei1_preferencia IS NOT NULL
        THEN
          CASE
            WHEN EXISTS (
              SELECT 1 FROM public.cmei_zonas cz
              WHERE cz.cmei_id = c.cmei1_preferencia
                AND cz.zona_id = c.zona_atendimento_id
            ) THEN cfg.prioridade_zona_bonus_dentro
            ELSE cfg.prioridade_zona_bonus_fora
          END
        ELSE 0
      END::int AS bonus_cmei1,
      CASE
        WHEN cfg.prioridade_zona_habilitada
          AND c.zona_atendimento_id IS NOT NULL
          AND c.cmei2_preferencia IS NOT NULL
        THEN
          CASE
            WHEN EXISTS (
              SELECT 1 FROM public.cmei_zonas cz
              WHERE cz.cmei_id = c.cmei2_preferencia
                AND cz.zona_id = c.zona_atendimento_id
            ) THEN cfg.prioridade_zona_bonus_dentro
            ELSE cfg.prioridade_zona_bonus_fora
          END
        ELSE 0
      END::int AS bonus_cmei2,
      CASE
        WHEN cfg.prioridade_zona_habilitada
          AND c.zona_atendimento_id IS NOT NULL
          AND c.cmei3_preferencia IS NOT NULL
        THEN
          CASE
            WHEN EXISTS (
              SELECT 1 FROM public.cmei_zonas cz
              WHERE cz.cmei_id = c.cmei3_preferencia
                AND cz.zona_id = c.zona_atendimento_id
            ) THEN cfg.prioridade_zona_bonus_dentro
            ELSE cfg.prioridade_zona_bonus_fora
          END
        ELSE 0
      END::int AS bonus_cmei3
    FROM public.criancas c
    CROSS JOIN configuracoes cfg
  ),
  base_dates AS (
    SELECT
      c.id,
      COALESCE(c.data_penalidade, c.data_retorno_fila, c.created_at) AS data_base
    FROM public.criancas c
  ),
  scored AS (
    SELECT
      c.id,
      c.cmei1_preferencia,
      c.cmei2_preferencia,
      c.cmei3_preferencia,
      bd.data_base,
      (COALESCE(p.pontos_prioridades, 0)
        + COALESCE(psoc.pontos_programas_sociais, 0)
        + COALESCE(pr.pontos_remanejamento, 0)
        + COALESCE(bz.bonus_cmei1, 0)
        + (CASE WHEN cfg.peso_data_cadastro <> 0
                THEN (GREATEST(0, DATE_PART('day', now() - bd.data_base))::int) * cfg.peso_data_cadastro
                ELSE 0 END)
      )::int AS score_cmei1,
      (COALESCE(p.pontos_prioridades, 0)
        + COALESCE(psoc.pontos_programas_sociais, 0)
        + COALESCE(pr.pontos_remanejamento, 0)
        + COALESCE(bz.bonus_cmei2, 0)
        + (CASE WHEN cfg.peso_data_cadastro <> 0
                THEN (GREATEST(0, DATE_PART('day', now() - bd.data_base))::int) * cfg.peso_data_cadastro
                ELSE 0 END)
      )::int AS score_cmei2,
      (COALESCE(p.pontos_prioridades, 0)
        + COALESCE(psoc.pontos_programas_sociais, 0)
        + COALESCE(pr.pontos_remanejamento, 0)
        + COALESCE(bz.bonus_cmei3, 0)
        + (CASE WHEN cfg.peso_data_cadastro <> 0
                THEN (GREATEST(0, DATE_PART('day', now() - bd.data_base))::int) * cfg.peso_data_cadastro
                ELSE 0 END)
      )::int AS score_cmei3
    FROM public.criancas c
    LEFT JOIN prioridades_somadas p ON p.crianca_id = c.id
    LEFT JOIN pontos_sociais psoc ON psoc.crianca_id = c.id
    LEFT JOIN prioridade_remanejamento pr ON pr.crianca_id = c.id
    LEFT JOIN bonus_zona bz ON bz.crianca_id = c.id
    LEFT JOIN base_dates bd ON bd.id = c.id
    CROSS JOIN configuracoes cfg
    WHERE c.status IN ('Fila de Espera', 'Aguardando')
  ),
  ordered_children AS (
    SELECT 
      s.*,
      ROW_NUMBER() OVER (
        PARTITION BY s.cmei1_preferencia 
        ORDER BY 
          s.score_cmei1 DESC,
          s.data_base ASC
      ) as new_pos_cmei1,
      ROW_NUMBER() OVER (
        PARTITION BY s.cmei2_preferencia 
        ORDER BY 
          s.score_cmei2 DESC,
          s.data_base ASC
      ) as new_pos_cmei2,
      ROW_NUMBER() OVER (
        PARTITION BY s.cmei3_preferencia 
        ORDER BY 
          s.score_cmei3 DESC,
          s.data_base ASC
      ) as new_pos_cmei3
    FROM scored s
  )
  UPDATE public.criancas c
  SET 
    score_cmei1 = oc.score_cmei1,
    score_cmei2 = oc.score_cmei2,
    score_cmei3 = oc.score_cmei3,
    posicao_fila = CASE 
      WHEN c.cmei1_preferencia IS NOT NULL THEN oc.new_pos_cmei1
      ELSE NULL
    END,
    posicao_fila_cmei2 = CASE 
      WHEN c.cmei2_preferencia IS NOT NULL THEN oc.new_pos_cmei2
      ELSE NULL
    END,
    posicao_fila_cmei3 = CASE 
      WHEN c.cmei3_preferencia IS NOT NULL THEN oc.new_pos_cmei3
      ELSE NULL
    END,
    updated_at = now()
  FROM ordered_children oc
  WHERE c.id = oc.id;
END;
$function$;

DROP FUNCTION IF EXISTS public.simular_fila_cmei(uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.simular_fila_cmei(
  p_cmei_id uuid,
  p_preferencia integer DEFAULT 1,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  posicao integer,
  crianca_id uuid,
  nome text,
  data_base timestamp with time zone,
  score_total integer,
  pontos_prioridades integer,
  pontos_programas_sociais integer,
  pontos_remanejamento integer,
  pontos_zona integer,
  pontos_data integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH cfg AS (
    SELECT 
      prioridade_social_habilitada,
      prioridade_remanejamento_habilitada,
      prioridade_zona_habilitada,
      prioridade_zona_bonus_dentro,
      prioridade_zona_bonus_fora,
      peso_programas_sociais,
      peso_data_cadastro
    FROM public.configuracoes_sistema
    LIMIT 1
  ),
  candidatos AS (
    SELECT
      c.id,
      c.nome,
      c.programas_sociais,
      c.prioridade,
      c.status,
      c.zona_atendimento_id,
      COALESCE(c.data_penalidade, c.data_retorno_fila, c.created_at) AS data_base,
      CASE 
        WHEN p_preferencia = 1 THEN c.cmei1_preferencia
        WHEN p_preferencia = 2 THEN c.cmei2_preferencia
        WHEN p_preferencia = 3 THEN c.cmei3_preferencia
        ELSE c.cmei1_preferencia
      END AS cmei_escolhido
    FROM public.criancas c
    WHERE c.status IN ('Fila de Espera', 'Aguardando')
  ),
  prioridades_somadas AS (
    SELECT 
      cp.crianca_id,
      SUM(tp.peso)::int AS pontos_prioridades
    FROM public.crianca_prioridades cp
    JOIN public.tipos_prioridade tp ON tp.id = cp.prioridade_id
    CROSS JOIN cfg
    WHERE cp.status = 'aprovado'
      AND tp.ativo = true
      AND (tp.codigo <> 'social' OR cfg.prioridade_social_habilitada = true)
    GROUP BY cp.crianca_id
  ),
  sociais AS (
    SELECT
      c.id AS crianca_id,
      CASE
        WHEN cfg.prioridade_social_habilitada
          AND c.programas_sociais = true
          AND c.data_penalidade IS NULL
        THEN cfg.peso_programas_sociais
        ELSE 0
      END::int AS pontos_programas_sociais
    FROM public.criancas c
    CROSS JOIN cfg
  ),
  remanejamento AS (
    SELECT
      c.id AS crianca_id,
      CASE 
        WHEN cfg.prioridade_remanejamento_habilitada AND c.prioridade = 'Remanejamento' THEN 100
        ELSE 0
      END::int AS pontos_remanejamento
    FROM public.criancas c
    CROSS JOIN cfg
  ),
  zona AS (
    SELECT
      c.id AS crianca_id,
      CASE
        WHEN cfg.prioridade_zona_habilitada
          AND c.zona_atendimento_id IS NOT NULL
          AND c.cmei_escolhido IS NOT NULL
        THEN
          CASE
            WHEN EXISTS (
              SELECT 1 FROM public.cmei_zonas cz
              WHERE cz.cmei_id = c.cmei_escolhido
                AND cz.zona_id = c.zona_atendimento_id
            ) THEN cfg.prioridade_zona_bonus_dentro
            ELSE cfg.prioridade_zona_bonus_fora
          END
        ELSE 0
      END::int AS pontos_zona
    FROM candidatos c
    CROSS JOIN cfg
  ),
  tempo AS (
    SELECT
      c.id AS crianca_id,
      CASE
        WHEN cfg.peso_data_cadastro <> 0 THEN (GREATEST(0, DATE_PART('day', now() - c.data_base))::int) * cfg.peso_data_cadastro
        ELSE 0
      END::int AS pontos_data
    FROM candidatos c
    CROSS JOIN cfg
  ),
  scored AS (
    SELECT
      c.id AS crianca_id,
      c.nome,
      c.data_base,
      COALESCE(p.pontos_prioridades, 0) AS pontos_prioridades,
      COALESCE(soc.pontos_programas_sociais, 0) AS pontos_programas_sociais,
      COALESCE(r.pontos_remanejamento, 0) AS pontos_remanejamento,
      COALESCE(z.pontos_zona, 0) AS pontos_zona,
      COALESCE(t.pontos_data, 0) AS pontos_data,
      (COALESCE(p.pontos_prioridades, 0)
        + COALESCE(soc.pontos_programas_sociais, 0)
        + COALESCE(r.pontos_remanejamento, 0)
        + COALESCE(z.pontos_zona, 0)
        + COALESCE(t.pontos_data, 0))::int AS score_total
    FROM candidatos c
    LEFT JOIN prioridades_somadas p ON p.crianca_id = c.id
    LEFT JOIN sociais soc ON soc.crianca_id = c.id
    LEFT JOIN remanejamento r ON r.crianca_id = c.id
    LEFT JOIN zona z ON z.crianca_id = c.id
    LEFT JOIN tempo t ON t.crianca_id = c.id
    WHERE c.cmei_escolhido = p_cmei_id
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY s.score_total DESC, s.data_base ASC)::int AS posicao,
    s.crianca_id,
    s.nome,
    s.data_base,
    s.score_total,
    s.pontos_prioridades,
    s.pontos_programas_sociais,
    s.pontos_remanejamento,
    s.pontos_zona,
    s.pontos_data
  FROM scored s
  ORDER BY s.score_total DESC, s.data_base ASC
  LIMIT GREATEST(1, LEAST(p_limit, 200));
END;
$$;

GRANT EXECUTE ON FUNCTION public.simular_fila_cmei(uuid, integer, integer) TO authenticated;

