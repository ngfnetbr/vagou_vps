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
  v_pendentes integer;
  v_pendentes_nomes text;
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

  WITH tipos_base AS (
    SELECT dt.id, dt.nome
    FROM public.documentos_tipos dt
    WHERE dt.obrigatorio = true AND dt.ativo = true
  ),
  prioridades AS (
    SELECT cp.status,
           cp.documento_comprovante_url,
           tp.exige_documento,
           tp.ativo,
           tp.documento_tipo_id
    FROM public.crianca_prioridades cp
    JOIN public.tipos_prioridade tp ON tp.id = cp.prioridade_id
    WHERE cp.crianca_id = p_crianca_id
  ),
  tipos_extra AS (
    SELECT DISTINCT p.documento_tipo_id AS id
    FROM prioridades p
    WHERE p.exige_documento = true AND p.ativo = true AND p.documento_tipo_id IS NOT NULL
  ),
  tipos_obrigatorios AS (
    SELECT tb.id, tb.nome FROM tipos_base tb
    UNION
    SELECT dt.id, dt.nome
    FROM public.documentos_tipos dt
    JOIN tipos_extra te ON te.id = dt.id
  ),
  aprovados_doc AS (
    SELECT DISTINCT dc.tipo_documento_id AS id
    FROM public.documentos_crianca dc
    WHERE dc.crianca_id = p_crianca_id AND dc.status = 'aprovado'
  ),
  aprovados_prio AS (
    SELECT DISTINCT p.documento_tipo_id AS id
    FROM prioridades p
    WHERE p.status = 'aprovado' AND p.documento_comprovante_url IS NOT NULL AND p.documento_tipo_id IS NOT NULL
  ),
  aprovados AS (
    SELECT id FROM aprovados_doc
    UNION
    SELECT id FROM aprovados_prio
  ),
  pendentes AS (
    SELECT o.id, o.nome
    FROM tipos_obrigatorios o
    LEFT JOIN aprovados a ON a.id = o.id
    WHERE a.id IS NULL
  )
  SELECT
    COUNT(*)::int,
    COALESCE(string_agg(p.nome, ', ' ORDER BY p.nome), '')
  INTO v_pendentes, v_pendentes_nomes
  FROM pendentes p;

  IF v_pendentes IS NULL THEN
    v_pendentes := 0;
  END IF;

  IF v_pendentes > 0 THEN
    IF v_pendentes_nomes IS NULL OR v_pendentes_nomes = '' THEN
      RAISE EXCEPTION 'Documentação obrigatória pendente de aprovação';
    END IF;
    RAISE EXCEPTION 'Documentação obrigatória pendente de aprovação: %', v_pendentes_nomes;
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
REVOKE EXECUTE ON FUNCTION public.confirmar_matricula_crianca(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.confirmar_matricula_crianca(uuid) TO authenticated;
