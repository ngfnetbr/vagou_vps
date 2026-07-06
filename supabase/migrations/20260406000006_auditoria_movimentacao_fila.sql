CREATE OR REPLACE FUNCTION public.log_movimentacao_fila()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  old_data jsonb;
  new_data jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    new_data := jsonb_build_object(
      'status', NEW.status,
      'prioridade', NEW.prioridade,
      'cmei1_preferencia', NEW.cmei1_preferencia,
      'cmei2_preferencia', NEW.cmei2_preferencia,
      'cmei3_preferencia', NEW.cmei3_preferencia,
      'cmei_remanejamento_id', NEW.cmei_remanejamento_id,
      'data_penalidade', NEW.data_penalidade,
      'data_retorno_fila', NEW.data_retorno_fila,
      'posicao_fila', NEW.posicao_fila,
      'posicao_fila_cmei2', NEW.posicao_fila_cmei2,
      'posicao_fila_cmei3', NEW.posicao_fila_cmei3,
      'score_cmei1', NEW.score_cmei1,
      'score_cmei2', NEW.score_cmei2,
      'score_cmei3', NEW.score_cmei3,
      'pontos_base_fila', NEW.pontos_base_fila,
      'pontos_prioridades', NEW.pontos_prioridades,
      'pontos_programas_sociais', NEW.pontos_programas_sociais,
      'pontos_remanejamento', NEW.pontos_remanejamento,
      'pontos_data_cadastro', NEW.pontos_data_cadastro,
      'bonus_zona_cmei1', NEW.bonus_zona_cmei1,
      'bonus_zona_cmei2', NEW.bonus_zona_cmei2,
      'bonus_zona_cmei3', NEW.bonus_zona_cmei3,
      'created_at', NEW.created_at,
      'updated_at', NEW.updated_at
    );

    INSERT INTO public.auditoria (
      tabela,
      operacao,
      registro_id,
      dados_antigos,
      dados_novos,
      usuario_id,
      created_at
    )
    VALUES (
      'fila',
      'INSERT',
      NEW.id,
      NULL,
      new_data,
      auth.uid(),
      now()
    );

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NOT (
      OLD.status IS DISTINCT FROM NEW.status OR
      OLD.prioridade IS DISTINCT FROM NEW.prioridade OR
      OLD.cmei1_preferencia IS DISTINCT FROM NEW.cmei1_preferencia OR
      OLD.cmei2_preferencia IS DISTINCT FROM NEW.cmei2_preferencia OR
      OLD.cmei3_preferencia IS DISTINCT FROM NEW.cmei3_preferencia OR
      OLD.cmei_remanejamento_id IS DISTINCT FROM NEW.cmei_remanejamento_id OR
      OLD.data_penalidade IS DISTINCT FROM NEW.data_penalidade OR
      OLD.data_retorno_fila IS DISTINCT FROM NEW.data_retorno_fila OR
      OLD.posicao_fila IS DISTINCT FROM NEW.posicao_fila OR
      OLD.posicao_fila_cmei2 IS DISTINCT FROM NEW.posicao_fila_cmei2 OR
      OLD.posicao_fila_cmei3 IS DISTINCT FROM NEW.posicao_fila_cmei3 OR
      OLD.score_cmei1 IS DISTINCT FROM NEW.score_cmei1 OR
      OLD.score_cmei2 IS DISTINCT FROM NEW.score_cmei2 OR
      OLD.score_cmei3 IS DISTINCT FROM NEW.score_cmei3 OR
      OLD.pontos_base_fila IS DISTINCT FROM NEW.pontos_base_fila OR
      OLD.pontos_prioridades IS DISTINCT FROM NEW.pontos_prioridades OR
      OLD.pontos_programas_sociais IS DISTINCT FROM NEW.pontos_programas_sociais OR
      OLD.pontos_remanejamento IS DISTINCT FROM NEW.pontos_remanejamento OR
      OLD.pontos_data_cadastro IS DISTINCT FROM NEW.pontos_data_cadastro OR
      OLD.bonus_zona_cmei1 IS DISTINCT FROM NEW.bonus_zona_cmei1 OR
      OLD.bonus_zona_cmei2 IS DISTINCT FROM NEW.bonus_zona_cmei2 OR
      OLD.bonus_zona_cmei3 IS DISTINCT FROM NEW.bonus_zona_cmei3
    ) THEN
      RETURN NEW;
    END IF;

    old_data := jsonb_build_object(
      'status', OLD.status,
      'prioridade', OLD.prioridade,
      'cmei1_preferencia', OLD.cmei1_preferencia,
      'cmei2_preferencia', OLD.cmei2_preferencia,
      'cmei3_preferencia', OLD.cmei3_preferencia,
      'cmei_remanejamento_id', OLD.cmei_remanejamento_id,
      'data_penalidade', OLD.data_penalidade,
      'data_retorno_fila', OLD.data_retorno_fila,
      'posicao_fila', OLD.posicao_fila,
      'posicao_fila_cmei2', OLD.posicao_fila_cmei2,
      'posicao_fila_cmei3', OLD.posicao_fila_cmei3,
      'score_cmei1', OLD.score_cmei1,
      'score_cmei2', OLD.score_cmei2,
      'score_cmei3', OLD.score_cmei3,
      'pontos_base_fila', OLD.pontos_base_fila,
      'pontos_prioridades', OLD.pontos_prioridades,
      'pontos_programas_sociais', OLD.pontos_programas_sociais,
      'pontos_remanejamento', OLD.pontos_remanejamento,
      'pontos_data_cadastro', OLD.pontos_data_cadastro,
      'bonus_zona_cmei1', OLD.bonus_zona_cmei1,
      'bonus_zona_cmei2', OLD.bonus_zona_cmei2,
      'bonus_zona_cmei3', OLD.bonus_zona_cmei3,
      'created_at', OLD.created_at,
      'updated_at', OLD.updated_at
    );

    new_data := jsonb_build_object(
      'status', NEW.status,
      'prioridade', NEW.prioridade,
      'cmei1_preferencia', NEW.cmei1_preferencia,
      'cmei2_preferencia', NEW.cmei2_preferencia,
      'cmei3_preferencia', NEW.cmei3_preferencia,
      'cmei_remanejamento_id', NEW.cmei_remanejamento_id,
      'data_penalidade', NEW.data_penalidade,
      'data_retorno_fila', NEW.data_retorno_fila,
      'posicao_fila', NEW.posicao_fila,
      'posicao_fila_cmei2', NEW.posicao_fila_cmei2,
      'posicao_fila_cmei3', NEW.posicao_fila_cmei3,
      'score_cmei1', NEW.score_cmei1,
      'score_cmei2', NEW.score_cmei2,
      'score_cmei3', NEW.score_cmei3,
      'pontos_base_fila', NEW.pontos_base_fila,
      'pontos_prioridades', NEW.pontos_prioridades,
      'pontos_programas_sociais', NEW.pontos_programas_sociais,
      'pontos_remanejamento', NEW.pontos_remanejamento,
      'pontos_data_cadastro', NEW.pontos_data_cadastro,
      'bonus_zona_cmei1', NEW.bonus_zona_cmei1,
      'bonus_zona_cmei2', NEW.bonus_zona_cmei2,
      'bonus_zona_cmei3', NEW.bonus_zona_cmei3,
      'created_at', NEW.created_at,
      'updated_at', NEW.updated_at
    );

    INSERT INTO public.auditoria (
      tabela,
      operacao,
      registro_id,
      dados_antigos,
      dados_novos,
      usuario_id,
      created_at
    )
    VALUES (
      'fila',
      'UPDATE',
      NEW.id,
      old_data,
      new_data,
      auth.uid(),
      now()
    );

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_log_movimentacao_fila ON public.criancas;

CREATE TRIGGER tr_log_movimentacao_fila
AFTER INSERT OR UPDATE OF
  status,
  prioridade,
  cmei1_preferencia,
  cmei2_preferencia,
  cmei3_preferencia,
  cmei_remanejamento_id,
  data_penalidade,
  data_retorno_fila,
  posicao_fila,
  posicao_fila_cmei2,
  posicao_fila_cmei3,
  score_cmei1,
  score_cmei2,
  score_cmei3,
  pontos_base_fila,
  pontos_prioridades,
  pontos_programas_sociais,
  pontos_remanejamento,
  pontos_data_cadastro,
  bonus_zona_cmei1,
  bonus_zona_cmei2,
  bonus_zona_cmei3
ON public.criancas
FOR EACH ROW
EXECUTE FUNCTION public.log_movimentacao_fila();
