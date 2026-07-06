DROP FUNCTION IF EXISTS public.get_pontuacao_fila_detalhada(uuid);

CREATE FUNCTION public.get_pontuacao_fila_detalhada(p_crianca_id uuid)
RETURNS TABLE(
  crianca_id uuid,
  score_cmei1 integer,
  score_cmei2 integer,
  score_cmei3 integer,
  pontos_prioridades integer,
  pontos_programas_sociais integer,
  pontos_remanejamento integer,
  pontos_data_cadastro integer,
  bonus_zona_cmei1 integer,
  bonus_zona_cmei2 integer,
  bonus_zona_cmei3 integer,
  prioridade_social_habilitada boolean,
  prioridade_remanejamento_habilitada boolean,
  prioridade_zona_habilitada boolean,
  peso_programas_sociais integer,
  peso_remanejamento integer,
  peso_data_cadastro integer,
  prioridade_zona_bonus_dentro integer,
  prioridade_zona_bonus_fora integer,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'superadmin', 'gestor', 'diretor_cmei')
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.score_cmei1,
    c.score_cmei2,
    c.score_cmei3,
    c.pontos_prioridades,
    c.pontos_programas_sociais,
    c.pontos_remanejamento,
    c.pontos_data_cadastro,
    c.bonus_zona_cmei1,
    c.bonus_zona_cmei2,
    c.bonus_zona_cmei3,
    cfg.prioridade_social_habilitada,
    cfg.prioridade_remanejamento_habilitada,
    cfg.prioridade_zona_habilitada,
    cfg.peso_programas_sociais,
    cfg.peso_remanejamento,
    cfg.peso_data_cadastro,
    cfg.prioridade_zona_bonus_dentro,
    cfg.prioridade_zona_bonus_fora,
    c.updated_at
  FROM public.criancas c
  CROSS JOIN LATERAL (
    SELECT
      prioridade_social_habilitada,
      prioridade_remanejamento_habilitada,
      prioridade_zona_habilitada,
      peso_programas_sociais,
      peso_remanejamento,
      peso_data_cadastro,
      prioridade_zona_bonus_dentro,
      prioridade_zona_bonus_fora
    FROM public.configuracoes_sistema
    LIMIT 1
  ) cfg
  WHERE c.id = p_crianca_id;
END;
$$;

