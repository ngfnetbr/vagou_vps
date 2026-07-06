-- Criar função para inserção pública de crianças (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.inserir_inscricao_publica(
  p_nome text,
  p_data_nascimento date,
  p_sexo text,
  p_responsavel_nome text,
  p_responsavel_cpf text,
  p_responsavel_telefone text,
  p_responsavel_email text DEFAULT NULL,
  p_responsavel_celular text DEFAULT NULL,
  p_cpf_crianca text DEFAULT NULL,
  p_certidao_nascimento text DEFAULT NULL,
  p_cep text DEFAULT NULL,
  p_logradouro text DEFAULT NULL,
  p_numero text DEFAULT NULL,
  p_complemento text DEFAULT NULL,
  p_bairro text DEFAULT NULL,
  p_cidade text DEFAULT NULL,
  p_estado text DEFAULT NULL,
  p_cmei1_preferencia uuid DEFAULT NULL,
  p_cmei2_preferencia uuid DEFAULT NULL,
  p_aceita_qualquer_cmei boolean DEFAULT false,
  p_programas_sociais boolean DEFAULT false,
  p_observacoes text DEFAULT NULL,
  p_responsavel_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_crianca_id uuid;
  v_prioridade prioridade_tipo;
BEGIN
  -- Determinar prioridade
  v_prioridade := CASE WHEN p_programas_sociais THEN 'Social'::prioridade_tipo ELSE 'Geral'::prioridade_tipo END;
  
  -- Inserir criança
  INSERT INTO criancas (
    nome,
    data_nascimento,
    sexo,
    responsavel_nome,
    responsavel_cpf,
    responsavel_telefone,
    responsavel_email,
    responsavel_celular,
    cpf_crianca,
    certidao_nascimento,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    cmei1_preferencia,
    cmei2_preferencia,
    aceita_qualquer_cmei,
    programas_sociais,
    observacoes,
    responsavel_user_id,
    status,
    prioridade
  ) VALUES (
    p_nome,
    p_data_nascimento,
    p_sexo::sexo_tipo,
    p_responsavel_nome,
    p_responsavel_cpf,
    p_responsavel_telefone,
    p_responsavel_email,
    p_responsavel_celular,
    p_cpf_crianca,
    p_certidao_nascimento,
    p_cep,
    p_logradouro,
    p_numero,
    p_complemento,
    p_bairro,
    p_cidade,
    p_estado,
    p_cmei1_preferencia,
    p_cmei2_preferencia,
    p_aceita_qualquer_cmei,
    p_programas_sociais,
    p_observacoes,
    p_responsavel_user_id,
    'Fila de Espera'::status_crianca,
    v_prioridade
  )
  RETURNING id INTO v_crianca_id;
  
  -- Inserir no histórico
  INSERT INTO historico (crianca_id, acao, descricao, status_novo)
  VALUES (v_crianca_id, 'Inscrição Realizada', 'Inscrição realizada através do formulário público', 'Fila de Espera'::status_crianca);
  
  -- Recalcular posições da fila
  PERFORM recalcular_posicoes_fila();
  
  RETURN v_crianca_id;
END;
$$;