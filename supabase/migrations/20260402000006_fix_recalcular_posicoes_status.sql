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
      prioridade_zona_bonus_fora
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
      END AS bonus_cmei2
    FROM public.criancas c
    CROSS JOIN configuracoes cfg
  ),
  ordered_children AS (
    SELECT 
      c.id,
      c.cmei1_preferencia,
      c.cmei2_preferencia,
      c.data_inscricao,
      ROW_NUMBER() OVER (
        PARTITION BY c.cmei1_preferencia 
        ORDER BY 
          COALESCE(ps.peso_total, 0) + COALESCE(pr.peso_remanejamento, 0) + COALESCE(bz.bonus_cmei1, 0) DESC,
          c.data_inscricao ASC
      ) as new_pos_cmei1,
      ROW_NUMBER() OVER (
        PARTITION BY c.cmei2_preferencia 
        ORDER BY 
          COALESCE(ps.peso_total, 0) + COALESCE(pr.peso_remanejamento, 0) + COALESCE(bz.bonus_cmei2, 0) DESC,
          c.data_inscricao ASC
      ) as new_pos_cmei2
    FROM public.criancas c
    LEFT JOIN prioridades_somadas ps ON ps.crianca_id = c.id
    LEFT JOIN prioridade_remanejamento pr ON pr.crianca_id = c.id
    LEFT JOIN bonus_zona bz ON bz.crianca_id = c.id
    WHERE c.status IN ('Fila de Espera', 'Aguardando')
  )
  UPDATE public.criancas c
  SET 
    posicao_fila = CASE 
      WHEN c.cmei1_preferencia IS NOT NULL THEN oc.new_pos_cmei1
      ELSE NULL
    END,
    posicao_fila_cmei2 = CASE 
      WHEN c.cmei2_preferencia IS NOT NULL THEN oc.new_pos_cmei2
      ELSE NULL
    END,
    updated_at = now()
  FROM ordered_children oc
  WHERE c.id = oc.id;
END;
$function$;

