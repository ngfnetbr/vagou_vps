CREATE OR REPLACE FUNCTION public.recalcular_posicoes_fila()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  WITH configuracoes AS (
    SELECT 
      prioridade_remanejamento_habilitada,
      prioridade_zona_habilitada,
      prioridade_zona_bonus_dentro,
      prioridade_zona_bonus_fora,
      peso_remanejamento,
      peso_data_cadastro,
      pontuacao_base_fila
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
    GROUP BY cp.crianca_id
  ),
  prioridade_remanejamento AS (
    SELECT 
      c.id AS crianca_id,
      CASE 
        WHEN cfg.prioridade_remanejamento_habilitada AND c.prioridade = 'Remanejamento' THEN GREATEST(0, cfg.peso_remanejamento)
        ELSE 0
      END::int AS pontos_remanejamento
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
            ) THEN GREATEST(0, cfg.prioridade_zona_bonus_dentro)
            ELSE GREATEST(0, cfg.prioridade_zona_bonus_fora)
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
            ) THEN GREATEST(0, cfg.prioridade_zona_bonus_dentro)
            ELSE GREATEST(0, cfg.prioridade_zona_bonus_fora)
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
            ) THEN GREATEST(0, cfg.prioridade_zona_bonus_dentro)
            ELSE GREATEST(0, cfg.prioridade_zona_bonus_fora)
          END
        ELSE 0
      END::int AS bonus_cmei3
    FROM public.criancas c
    CROSS JOIN configuracoes cfg
  ),
  scored AS (
    SELECT
      c.id,
      c.cmei1_preferencia,
      c.cmei2_preferencia,
      c.cmei3_preferencia,
      c.created_at,
      c.data_nascimento,
      GREATEST(0, cfg.pontuacao_base_fila)::int AS pontos_base_fila,
      COALESCE(p.pontos_prioridades, 0)::int AS pontos_prioridades,
      0::int AS pontos_programas_sociais,
      COALESCE(pr.pontos_remanejamento, 0)::int AS pontos_remanejamento,
      (
        CASE
          WHEN cfg.peso_data_cadastro <> 0
          THEN (GREATEST(0, DATE_PART('day', now() - c.created_at))::int) * GREATEST(0, cfg.peso_data_cadastro)
          ELSE 0
        END
      )::int AS pontos_data_cadastro,
      COALESCE(bz.bonus_cmei1, 0)::int AS bonus_cmei1,
      COALESCE(bz.bonus_cmei2, 0)::int AS bonus_cmei2,
      COALESCE(bz.bonus_cmei3, 0)::int AS bonus_cmei3,
      (COALESCE(pr.pontos_remanejamento, 0) > 0)::int AS is_remanejamento,
      (COALESCE(p.pontos_prioridades, 0) > 0)::int AS has_prioridade,
      LEAST(
        100,
        (
          GREATEST(0, cfg.pontuacao_base_fila)
          + COALESCE(p.pontos_prioridades, 0)
          + COALESCE(pr.pontos_remanejamento, 0)
          + COALESCE(bz.bonus_cmei1, 0)
          + (
            CASE
              WHEN cfg.peso_data_cadastro <> 0
              THEN (GREATEST(0, DATE_PART('day', now() - c.created_at))::int) * GREATEST(0, cfg.peso_data_cadastro)
              ELSE 0
            END
          )
        )::int
      ) AS score_cmei1,
      LEAST(
        100,
        (
          GREATEST(0, cfg.pontuacao_base_fila)
          + COALESCE(p.pontos_prioridades, 0)
          + COALESCE(pr.pontos_remanejamento, 0)
          + COALESCE(bz.bonus_cmei2, 0)
          + (
            CASE
              WHEN cfg.peso_data_cadastro <> 0
              THEN (GREATEST(0, DATE_PART('day', now() - c.created_at))::int) * GREATEST(0, cfg.peso_data_cadastro)
              ELSE 0
            END
          )
        )::int
      ) AS score_cmei2,
      LEAST(
        100,
        (
          GREATEST(0, cfg.pontuacao_base_fila)
          + COALESCE(p.pontos_prioridades, 0)
          + COALESCE(pr.pontos_remanejamento, 0)
          + COALESCE(bz.bonus_cmei3, 0)
          + (
            CASE
              WHEN cfg.peso_data_cadastro <> 0
              THEN (GREATEST(0, DATE_PART('day', now() - c.created_at))::int) * GREATEST(0, cfg.peso_data_cadastro)
              ELSE 0
            END
          )
        )::int
      ) AS score_cmei3
    FROM public.criancas c
    LEFT JOIN prioridades_somadas p ON p.crianca_id = c.id
    LEFT JOIN prioridade_remanejamento pr ON pr.crianca_id = c.id
    LEFT JOIN bonus_zona bz ON bz.crianca_id = c.id
    CROSS JOIN configuracoes cfg
    WHERE c.status = 'Fila de Espera'
  ),
  ordered_children AS (
    SELECT 
      s.*,
      ROW_NUMBER() OVER (
        PARTITION BY s.cmei1_preferencia 
        ORDER BY 
          s.is_remanejamento DESC,
          s.has_prioridade DESC,
          s.score_cmei1 DESC,
          s.created_at ASC,
          s.data_nascimento ASC
      ) AS new_pos_cmei1,
      ROW_NUMBER() OVER (
        PARTITION BY s.cmei2_preferencia 
        ORDER BY 
          s.is_remanejamento DESC,
          s.has_prioridade DESC,
          s.score_cmei2 DESC,
          s.created_at ASC,
          s.data_nascimento ASC
      ) AS new_pos_cmei2,
      ROW_NUMBER() OVER (
        PARTITION BY s.cmei3_preferencia 
        ORDER BY 
          s.is_remanejamento DESC,
          s.has_prioridade DESC,
          s.score_cmei3 DESC,
          s.created_at ASC,
          s.data_nascimento ASC
      ) AS new_pos_cmei3
    FROM scored s
  )
  UPDATE public.criancas c
  SET 
    pontos_base_fila = oc.pontos_base_fila,
    pontos_prioridades = oc.pontos_prioridades,
    pontos_programas_sociais = oc.pontos_programas_sociais,
    pontos_remanejamento = oc.pontos_remanejamento,
    pontos_data_cadastro = oc.pontos_data_cadastro,
    bonus_zona_cmei1 = oc.bonus_cmei1,
    bonus_zona_cmei2 = oc.bonus_cmei2,
    bonus_zona_cmei3 = oc.bonus_cmei3,
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

SELECT public.recalcular_posicoes_fila();
