DO $$
DECLARE
  v_campo_id uuid;
BEGIN
  INSERT INTO public.campos_inscricao (
    secao,
    nome_campo,
    label,
    tipo,
    placeholder,
    obrigatorio,
    ativo,
    ordem,
    opcoes,
    validacao,
    mascara,
    campo_sistema,
    visivel_responsavel,
    editavel_apos_inscricao,
    dica
  )
  VALUES (
    'preferencias',
    'periodo',
    'Período',
    'select',
    'Selecione',
    true,
    true,
    10,
    '[{"value":"Matutino","label":"Matutino"},{"value":"Vespertino","label":"Vespertino"},{"value":"Integral","label":"Integral"}]'::jsonb,
    NULL,
    NULL,
    false,
    true,
    true,
    'Selecione o período desejado.'
  )
  ON CONFLICT (nome_campo) DO UPDATE SET
    secao = EXCLUDED.secao,
    label = EXCLUDED.label,
    tipo = EXCLUDED.tipo,
    placeholder = EXCLUDED.placeholder,
    obrigatorio = EXCLUDED.obrigatorio,
    ativo = EXCLUDED.ativo,
    ordem = EXCLUDED.ordem,
    opcoes = EXCLUDED.opcoes,
    campo_sistema = EXCLUDED.campo_sistema,
    visivel_responsavel = EXCLUDED.visivel_responsavel,
    editavel_apos_inscricao = EXCLUDED.editavel_apos_inscricao,
    dica = EXCLUDED.dica,
    updated_at = now();

  SELECT id INTO v_campo_id
  FROM public.campos_inscricao
  WHERE nome_campo = 'periodo'
  LIMIT 1;

  IF v_campo_id IS NOT NULL THEN
    INSERT INTO public.valores_campos_custom (crianca_id, campo_id, valor, created_at, updated_at)
    SELECT c.id, v_campo_id, 'Integral', now(), now()
    FROM public.criancas c
    ON CONFLICT (crianca_id, campo_id) DO UPDATE
      SET valor = EXCLUDED.valor,
          updated_at = now();
  END IF;
END $$;
