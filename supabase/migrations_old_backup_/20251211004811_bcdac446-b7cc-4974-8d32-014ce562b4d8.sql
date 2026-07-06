-- Atualizar trigger para também recalcular fila quando remanejamento é solicitado
CREATE OR REPLACE FUNCTION public.trigger_atualizar_posicao_fila()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Só recalcula se houve mudança relevante
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('Fila de Espera', 'Convocado') OR NEW.cmei_remanejamento_id IS NOT NULL THEN
      PERFORM recalcular_posicoes_fila();
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Recalcula se mudou status, prioridade OU cmei_remanejamento_id
    IF (OLD.status IS DISTINCT FROM NEW.status) OR 
       (OLD.prioridade IS DISTINCT FROM NEW.prioridade) OR
       (OLD.cmei_remanejamento_id IS DISTINCT FROM NEW.cmei_remanejamento_id) THEN
      PERFORM recalcular_posicoes_fila();
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('Fila de Espera', 'Convocado') OR OLD.cmei_remanejamento_id IS NOT NULL THEN
      PERFORM recalcular_posicoes_fila();
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;