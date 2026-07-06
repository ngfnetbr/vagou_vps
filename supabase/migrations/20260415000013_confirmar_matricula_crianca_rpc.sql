CREATE OR REPLACE FUNCTION public.confirmar_matricula_crianca(p_crianca_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
  v_is_diretor boolean;
  v_status_anterior text;
  v_status_novo text;
  v_cmei_atual_id uuid;
  v_sexo text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  v_is_admin := public.is_admin(v_user_id);
  v_is_diretor := public.has_role(v_user_id, 'diretor_cmei');

  IF NOT v_is_admin AND NOT v_is_diretor THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT c.status::text, c.cmei_atual_id, c.sexo::text
  INTO v_status_anterior, v_cmei_atual_id, v_sexo
  FROM public.criancas c
  WHERE c.id = p_crianca_id;

  IF v_status_anterior IS NULL THEN
    RAISE EXCEPTION 'Criança não encontrada';
  END IF;

  IF v_status_anterior <> 'Convocado' THEN
    RAISE EXCEPTION 'Ação inválida para o status atual';
  END IF;

  IF NOT v_is_admin THEN
    IF v_cmei_atual_id IS NULL OR NOT public.director_has_cmei_access(v_user_id, v_cmei_atual_id) THEN
      RAISE EXCEPTION 'Acesso negado';
    END IF;
  END IF;

  v_status_novo := CASE WHEN v_sexo = 'Feminino' THEN 'Matriculada' ELSE 'Matriculado' END;

  UPDATE public.criancas
  SET status = v_status_novo::public.status_crianca,
      convocacao_deadline = NULL,
      data_convocacao = NULL
  WHERE id = p_crianca_id;

  INSERT INTO public.historico (crianca_id, acao, status_anterior, status_novo, usuario_id)
  VALUES (p_crianca_id, 'Matrícula Confirmada', v_status_anterior::public.status_crianca, v_status_novo::public.status_crianca, v_user_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.confirmar_matricula_crianca(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirmar_matricula_crianca(uuid) TO authenticated;
