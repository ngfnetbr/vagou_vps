ALTER TABLE public.configuracoes_sistema
ADD COLUMN IF NOT EXISTS peso_data_cadastro integer NOT NULL DEFAULT 0;

ALTER TABLE public.criancas
ADD COLUMN IF NOT EXISTS score_cmei1 integer NULL,
ADD COLUMN IF NOT EXISTS score_cmei2 integer NULL,
ADD COLUMN IF NOT EXISTS score_cmei3 integer NULL;

DROP FUNCTION IF EXISTS public.recalcular_posicoes_fila();

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
      peso_data_cadastro
    FROM public.configuracoes_sistema
    LIMIT 1
  ),
  prioridades_somadas AS (
    SELECT 
      cp.crianca_id,
      SUM(tp.peso) AS peso_total
    FROM public.crianca_prioridades cp
    JOIN public.tipos_prioridade tp ON tp.id = cp.prioridade_id
    CROSS JOIN configuracoes cfg
    WHERE cp.status IN ('aprovado', 'pendente')
      AND tp.ativo = true
      AND (tp.codigo <> 'social' OR cfg.prioridade_social_habilitada = true)
    GROUP BY cp.crianca_id
  ),
  prioridade_remanejamento AS (
    SELECT 
      c.id as crianca_id,
      CASE 
        WHEN cfg.prioridade_remanejamento_habilitada AND c.prioridade = 'Remanejamento' THEN 100
        ELSE 0
      END as peso_remanejamento
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
      END AS bonus_cmei1,
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
      END AS bonus_cmei2,
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
      END AS bonus_cmei3
    FROM public.criancas c
    CROSS JOIN configuracoes cfg
  ),
  base_scores AS (
    SELECT
      c.id,
      COALESCE(ps.peso_total, 0) + COALESCE(pr.peso_remanejamento, 0) + COALESCE(bz.bonus_cmei1, 0) AS base_score_cmei1,
      COALESCE(ps.peso_total, 0) + COALESCE(pr.peso_remanejamento, 0) + COALESCE(bz.bonus_cmei2, 0) AS base_score_cmei2,
      COALESCE(ps.peso_total, 0) + COALESCE(pr.peso_remanejamento, 0) + COALESCE(bz.bonus_cmei3, 0) AS base_score_cmei3
    FROM public.criancas c
    LEFT JOIN prioridades_somadas ps ON ps.crianca_id = c.id
    LEFT JOIN prioridade_remanejamento pr ON pr.crianca_id = c.id
    LEFT JOIN bonus_zona bz ON bz.crianca_id = c.id
  ),
  scored AS (
    SELECT
      c.id,
      c.cmei1_preferencia,
      c.cmei2_preferencia,
      c.cmei3_preferencia,
      c.data_inscricao,
      bs.base_score_cmei1
        + (CASE WHEN cfg.peso_data_cadastro <> 0
                THEN (GREATEST(0, DATE_PART('day', now() - c.data_inscricao))::int) * cfg.peso_data_cadastro
                ELSE 0 END) AS score_cmei1,
      bs.base_score_cmei2
        + (CASE WHEN cfg.peso_data_cadastro <> 0
                THEN (GREATEST(0, DATE_PART('day', now() - c.data_inscricao))::int) * cfg.peso_data_cadastro
                ELSE 0 END) AS score_cmei2,
      bs.base_score_cmei3
        + (CASE WHEN cfg.peso_data_cadastro <> 0
                THEN (GREATEST(0, DATE_PART('day', now() - c.data_inscricao))::int) * cfg.peso_data_cadastro
                ELSE 0 END) AS score_cmei3
    FROM public.criancas c
    JOIN base_scores bs ON bs.id = c.id
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
          s.data_inscricao ASC
      ) as new_pos_cmei1,
      ROW_NUMBER() OVER (
        PARTITION BY s.cmei2_preferencia 
        ORDER BY 
          s.score_cmei2 DESC,
          s.data_inscricao ASC
      ) as new_pos_cmei2,
      ROW_NUMBER() OVER (
        PARTITION BY s.cmei3_preferencia 
        ORDER BY 
          s.score_cmei3 DESC,
          s.data_inscricao ASC
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

