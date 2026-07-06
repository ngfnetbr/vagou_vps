CREATE OR REPLACE FUNCTION public.convocar_crianca(
  p_crianca_id uuid,
  p_turma_id uuid,
  p_prazo_dias integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
  v_is_diretor boolean;
  v_diretor_cmei_id uuid;
  v_crianca_status text;
  v_crianca_aceita_qualquer boolean;
  v_cmei1 uuid;
  v_cmei2 uuid;
  v_cmei3 uuid;
  v_turma_cmei_id uuid;
  v_cmei_nome text;
  v_turma_nome text;
  v_deadline timestamptz;
  v_ocupadas integer;
  v_capacidade integer;
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

  IF p_prazo_dias IS NULL OR p_prazo_dias < 1 OR p_prazo_dias > 60 THEN
    RAISE EXCEPTION 'Prazo inválido';
  END IF;

  SELECT c.status::text,
         c.aceita_qualquer_cmei,
         c.cmei1_preferencia,
         c.cmei2_preferencia,
         c.cmei3_preferencia
  INTO v_crianca_status, v_crianca_aceita_qualquer, v_cmei1, v_cmei2, v_cmei3
  FROM public.criancas c
  WHERE c.id = p_crianca_id;

  IF v_crianca_status IS NULL THEN
    RAISE EXCEPTION 'Criança não encontrada';
  END IF;

  IF v_is_diretor THEN
    IF NOT public.has_permission(v_user_id, 'fila.convocar') THEN
      RAISE EXCEPTION 'Acesso negado';
    END IF;

    SELECT d.cmei_id
    INTO v_diretor_cmei_id
    FROM public.diretor_cmei_vinculo d
    WHERE d.user_id = v_user_id;

    IF v_diretor_cmei_id IS NULL THEN
      RAISE EXCEPTION 'Diretor sem CMEI vinculado';
    END IF;

    IF v_crianca_status <> 'Fila de Espera' THEN
      RAISE EXCEPTION 'Ação inválida para o status atual';
    END IF;

    IF NOT v_crianca_aceita_qualquer AND NOT (v_cmei1 = v_diretor_cmei_id OR v_cmei2 = v_diretor_cmei_id OR v_cmei3 = v_diretor_cmei_id) THEN
      RAISE EXCEPTION 'CMEI não está nas preferências da criança';
    END IF;
  END IF;

  SELECT t.cmei_id, t.nome, c.nome
  INTO v_turma_cmei_id, v_turma_nome, v_cmei_nome
  FROM public.turmas t
  JOIN public.cmeis c ON c.id = t.cmei_id
  WHERE t.id = p_turma_id AND t.ativo = true;

  IF v_turma_cmei_id IS NULL THEN
    RAISE EXCEPTION 'Turma inválida';
  END IF;

  IF v_is_diretor AND v_turma_cmei_id <> v_diretor_cmei_id THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT t.capacidade
  INTO v_capacidade
  FROM public.turmas t
  WHERE t.id = p_turma_id;

  SELECT COUNT(*)::int
  INTO v_ocupadas
  FROM public.criancas cr
  WHERE cr.turma_atual_id = p_turma_id;

  IF v_capacidade IS NOT NULL AND v_ocupadas >= v_capacidade THEN
    RAISE EXCEPTION 'Turma sem vagas';
  END IF;

  v_deadline := now() + (p_prazo_dias || ' days')::interval;

  UPDATE public.criancas
  SET status = 'Convocado'::public.status_crianca,
      cmei_atual_id = v_turma_cmei_id,
      turma_atual_id = p_turma_id,
      data_convocacao = now(),
      convocacao_deadline = v_deadline,
      posicao_fila = NULL,
      data_penalidade = NULL
  WHERE id = p_crianca_id;

  INSERT INTO public.historico (crianca_id, acao, descricao, status_anterior, status_novo, cmei_novo, turma_novo, usuario_id)
  VALUES (
    p_crianca_id,
    'Convocação para Matrícula',
    format('Convocado para %s - %s com prazo de %s dias', COALESCE(v_cmei_nome, 'CMEI'), COALESCE(v_turma_nome, 'Turma'), p_prazo_dias),
    v_crianca_status::public.status_crianca,
    'Convocado'::public.status_crianca,
    v_turma_cmei_id,
    p_turma_id,
    v_user_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.convocar_crianca(uuid, uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.convocar_crianca(uuid, uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.convocar_crianca(uuid, uuid, integer) TO authenticated;
