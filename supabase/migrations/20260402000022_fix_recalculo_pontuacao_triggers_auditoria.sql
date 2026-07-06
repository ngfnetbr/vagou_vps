CREATE OR REPLACE FUNCTION public.trigger_recalcular_fila()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.recalcular_posicoes_fila();
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_atualizar_posicao_fila()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  old_in_fila boolean;
  new_in_fila boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    new_in_fila := NEW.status IN ('Fila de Espera', 'Convocado', 'Aguardando Assinatura');
    IF new_in_fila THEN
      PERFORM public.recalcular_posicoes_fila();
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    old_in_fila := OLD.status IN ('Fila de Espera', 'Convocado', 'Aguardando Assinatura');
    new_in_fila := NEW.status IN ('Fila de Espera', 'Convocado', 'Aguardando Assinatura');

    IF old_in_fila OR new_in_fila THEN
      PERFORM public.recalcular_posicoes_fila();
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    old_in_fila := OLD.status IN ('Fila de Espera', 'Convocado', 'Aguardando Assinatura');
    IF old_in_fila THEN
      PERFORM public.recalcular_posicoes_fila();
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_atualizar_posicao_fila ON public.criancas;

CREATE TRIGGER tr_atualizar_posicao_fila
AFTER INSERT OR UPDATE OF
  status,
  prioridade,
  programas_sociais,
  data_penalidade,
  zona_atendimento_id,
  cmei1_preferencia,
  cmei2_preferencia,
  cmei3_preferencia,
  cmei_remanejamento_id,
  data_retorno_fila
OR DELETE
ON public.criancas
FOR EACH ROW
EXECUTE FUNCTION public.trigger_atualizar_posicao_fila();

DROP TRIGGER IF EXISTS tr_recalcular_fila_crianca_prioridades ON public.crianca_prioridades;

CREATE TRIGGER tr_recalcular_fila_crianca_prioridades
AFTER INSERT OR UPDATE OF status, prioridade_id, crianca_id OR DELETE
ON public.crianca_prioridades
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recalcular_fila();

DROP TRIGGER IF EXISTS tr_recalcular_fila_configuracoes ON public.configuracoes_sistema;

CREATE TRIGGER tr_recalcular_fila_configuracoes
AFTER UPDATE OF
  prioridade_social_habilitada,
  prioridade_remanejamento_habilitada,
  prioridade_zona_habilitada,
  prioridade_zona_bonus_dentro,
  prioridade_zona_bonus_fora,
  peso_programas_sociais,
  peso_remanejamento,
  peso_data_cadastro
ON public.configuracoes_sistema
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recalcular_fila();

DROP TRIGGER IF EXISTS tr_recalcular_fila_tipos_prioridade ON public.tipos_prioridade;

CREATE TRIGGER tr_recalcular_fila_tipos_prioridade
AFTER UPDATE OF peso, ativo ON public.tipos_prioridade
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recalcular_fila();

DROP TRIGGER IF EXISTS tr_recalcular_fila_cmei_zonas ON public.cmei_zonas;

CREATE TRIGGER tr_recalcular_fila_cmei_zonas
AFTER INSERT OR UPDATE OR DELETE ON public.cmei_zonas
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recalcular_fila();

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
