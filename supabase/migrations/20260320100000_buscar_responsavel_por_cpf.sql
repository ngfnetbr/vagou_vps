CREATE OR REPLACE FUNCTION public.buscar_responsavel_por_cpf(p_cpf text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cpf_limpo text;
  v_result jsonb;
BEGIN
  v_cpf_limpo := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  IF length(v_cpf_limpo) != 11 THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'responsavel_nome', c.responsavel_nome,
    'responsavel_telefone', c.responsavel_telefone,
    'responsavel_celular', c.responsavel_celular,
    'responsavel_email', c.responsavel_email,
    'cep', c.cep,
    'logradouro', c.logradouro,
    'numero', c.numero,
    'complemento', c.complemento,
    'bairro', c.bairro,
    'cidade', c.cidade,
    'estado', c.estado
  )
  INTO v_result
  FROM public.criancas c
  WHERE regexp_replace(coalesce(c.responsavel_cpf, ''), '\D', '', 'g') = v_cpf_limpo
  ORDER BY c.created_at DESC NULLS LAST
  LIMIT 1;

  IF v_result IS NOT NULL THEN
    RETURN v_result;
  END IF;

  SELECT jsonb_build_object(
    'responsavel_nome', p.nome_completo,
    'responsavel_telefone', p.telefone,
    'responsavel_celular', NULL,
    'responsavel_email', p.email,
    'cep', NULL,
    'logradouro', NULL,
    'numero', NULL,
    'complemento', NULL,
    'bairro', NULL,
    'cidade', NULL,
    'estado', NULL
  )
  INTO v_result
  FROM public.profiles p
  WHERE regexp_replace(coalesce(p.cpf, ''), '\D', '', 'g') = v_cpf_limpo
  ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC NULLS LAST
  LIMIT 1;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.buscar_responsavel_por_cpf(text) TO anon;
GRANT EXECUTE ON FUNCTION public.buscar_responsavel_por_cpf(text) TO authenticated;
