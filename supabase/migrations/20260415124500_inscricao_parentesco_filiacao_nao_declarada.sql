ALTER TABLE public.criancas
ADD COLUMN IF NOT EXISTS responsavel_parentesco text,
ADD COLUMN IF NOT EXISTS responsavel_parentesco_outro text,
ADD COLUMN IF NOT EXISTS filiacao1_nao_declarada boolean,
ADD COLUMN IF NOT EXISTS filiacao2_nao_declarada boolean;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS regproc
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'inserir_inscricao_publica'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.regproc || ' CASCADE';
  END LOOP;
END $$;

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
  p_cor_raca_autodeclarada text DEFAULT NULL,
  p_cor_raca_certidao text DEFAULT NULL,
  p_etnia_indigena text DEFAULT NULL,
  p_etnia_indigena_outra text DEFAULT NULL,
  p_quilombo_remanescente boolean DEFAULT NULL,
  p_quilombo_nome text DEFAULT NULL,
  p_nacionalidade text DEFAULT NULL,
  p_estrangeiro_possui_documentos boolean DEFAULT NULL,
  p_nis text DEFAULT NULL,
  p_cep text DEFAULT NULL,
  p_logradouro text DEFAULT NULL,
  p_numero text DEFAULT NULL,
  p_complemento text DEFAULT NULL,
  p_bairro text DEFAULT NULL,
  p_cidade text DEFAULT NULL,
  p_estado text DEFAULT NULL,
  p_unidade_consumidora text DEFAULT NULL,
  p_forma_ocupacao_moradia text DEFAULT NULL,
  p_forma_ocupacao_moradia_outro text DEFAULT NULL,
  p_responsavel_rg text DEFAULT NULL,
  p_responsavel_parentesco text DEFAULT NULL,
  p_responsavel_parentesco_outro text DEFAULT NULL,
  p_responsavel_telefone_comercial text DEFAULT NULL,
  p_filiacao1_nao_declarada boolean DEFAULT false,
  p_filiacao1_nome text DEFAULT NULL,
  p_filiacao1_rg text DEFAULT NULL,
  p_filiacao1_cpf text DEFAULT NULL,
  p_filiacao1_email text DEFAULT NULL,
  p_filiacao1_celular text DEFAULT NULL,
  p_filiacao1_telefone_comercial text DEFAULT NULL,
  p_filiacao2_nao_declarada boolean DEFAULT false,
  p_filiacao2_nome text DEFAULT NULL,
  p_filiacao2_rg text DEFAULT NULL,
  p_filiacao2_cpf text DEFAULT NULL,
  p_filiacao2_email text DEFAULT NULL,
  p_filiacao2_celular text DEFAULT NULL,
  p_filiacao2_telefone_comercial text DEFAULT NULL,
  p_cmei1_preferencia uuid DEFAULT NULL,
  p_cmei2_preferencia uuid DEFAULT NULL,
  p_aceita_qualquer_cmei boolean DEFAULT false,
  p_programas_sociais boolean DEFAULT false,
  p_observacoes text DEFAULT NULL,
  p_responsavel_user_id uuid DEFAULT NULL,
  p_zona_atendimento_id uuid DEFAULT NULL,
  p_cmei3_preferencia uuid DEFAULT NULL,
  p_canal_notificacao_preferido text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_crianca_id uuid;
  v_prioridade prioridade_tipo;
  v_cpf_limpo text;
  v_cpf_crianca_limpo text;
  v_rate_limit_count integer;
  v_limite_inscricoes integer;
  v_inscricoes_existentes integer;
BEGIN
  v_cpf_limpo := regexp_replace(p_responsavel_cpf, '\D', '', 'g');

  IF NOT validar_cpf(v_cpf_limpo) THEN
    RAISE EXCEPTION 'CPF do responsável inválido: não passou na verificação de dígitos';
  END IF;

  IF p_cpf_crianca IS NOT NULL AND trim(p_cpf_crianca) != '' THEN
    v_cpf_crianca_limpo := regexp_replace(p_cpf_crianca, '\D', '', 'g');
    IF length(v_cpf_crianca_limpo) > 0 AND NOT validar_cpf(v_cpf_crianca_limpo) THEN
      RAISE EXCEPTION 'CPF da criança inválido: não passou na verificação de dígitos';
    END IF;
  END IF;

  IF length(trim(p_nome)) < 3 THEN
    RAISE EXCEPTION 'Nome da criança deve ter pelo menos 3 caracteres';
  END IF;

  IF length(trim(p_responsavel_nome)) < 3 THEN
    RAISE EXCEPTION 'Nome do responsável deve ter pelo menos 3 caracteres';
  END IF;

  SELECT COUNT(*) INTO v_rate_limit_count
  FROM rate_limit_entries
  WHERE identifier = v_cpf_limpo
    AND endpoint = 'inscricao_publica'
    AND window_start > now() - interval '1 hour';

  IF v_rate_limit_count >= 5 THEN
    RAISE EXCEPTION 'Limite de inscrições excedido. Aguarde antes de tentar novamente.';
  END IF;

  INSERT INTO rate_limit_entries (identifier, endpoint, window_start)
  VALUES (v_cpf_limpo, 'inscricao_publica', now());

  SELECT COALESCE(limite_inscricoes_responsavel, 5) INTO v_limite_inscricoes
  FROM configuracoes_sistema LIMIT 1;

  SELECT COUNT(*) INTO v_inscricoes_existentes
  FROM criancas
  WHERE responsavel_cpf = v_cpf_limpo
    AND status NOT IN ('Desistente', 'Recusada', 'Transferido');

  IF v_inscricoes_existentes >= v_limite_inscricoes THEN
    RAISE EXCEPTION 'Limite de inscrições ativas atingido (máximo: %)', v_limite_inscricoes;
  END IF;

  v_prioridade := CASE WHEN p_programas_sociais THEN 'Social'::prioridade_tipo ELSE 'Geral'::prioridade_tipo END;

  INSERT INTO criancas (
    nome,
    data_nascimento,
    sexo,
    cor_raca_autodeclarada,
    cor_raca_certidao,
    etnia_indigena,
    etnia_indigena_outra,
    quilombo_remanescente,
    quilombo_nome,
    nacionalidade,
    estrangeiro_possui_documentos,
    nis,
    responsavel_nome,
    responsavel_cpf,
    responsavel_telefone,
    responsavel_email,
    responsavel_celular,
    responsavel_rg,
    responsavel_parentesco,
    responsavel_parentesco_outro,
    responsavel_telefone_comercial,
    filiacao1_nao_declarada,
    filiacao1_nome,
    filiacao1_rg,
    filiacao1_cpf,
    filiacao1_email,
    filiacao1_celular,
    filiacao1_telefone_comercial,
    filiacao2_nao_declarada,
    filiacao2_nome,
    filiacao2_rg,
    filiacao2_cpf,
    filiacao2_email,
    filiacao2_celular,
    filiacao2_telefone_comercial,
    cpf_crianca,
    certidao_nascimento,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    unidade_consumidora,
    forma_ocupacao_moradia,
    forma_ocupacao_moradia_outro,
    zona_atendimento_id,
    cmei1_preferencia,
    cmei2_preferencia,
    cmei3_preferencia,
    aceita_qualquer_cmei,
    programas_sociais,
    observacoes,
    responsavel_user_id,
    canal_notificacao_preferido,
    status,
    prioridade
  ) VALUES (
    trim(p_nome),
    p_data_nascimento,
    p_sexo::sexo_tipo,
    p_cor_raca_autodeclarada,
    p_cor_raca_certidao,
    p_etnia_indigena,
    p_etnia_indigena_outra,
    p_quilombo_remanescente,
    p_quilombo_nome,
    p_nacionalidade,
    p_estrangeiro_possui_documentos,
    p_nis,
    trim(p_responsavel_nome),
    v_cpf_limpo,
    p_responsavel_telefone,
    lower(trim(p_responsavel_email)),
    p_responsavel_celular,
    p_responsavel_rg,
    p_responsavel_parentesco,
    p_responsavel_parentesco_outro,
    p_responsavel_telefone_comercial,
    coalesce(p_filiacao1_nao_declarada, false),
    p_filiacao1_nome,
    p_filiacao1_rg,
    CASE
      WHEN p_filiacao1_cpf IS NULL OR length(trim(p_filiacao1_cpf)) = 0 THEN NULL
      ELSE regexp_replace(p_filiacao1_cpf, '\D', '', 'g')
    END,
    lower(trim(p_filiacao1_email)),
    p_filiacao1_celular,
    p_filiacao1_telefone_comercial,
    coalesce(p_filiacao2_nao_declarada, false),
    p_filiacao2_nome,
    p_filiacao2_rg,
    CASE
      WHEN p_filiacao2_cpf IS NULL OR length(trim(p_filiacao2_cpf)) = 0 THEN NULL
      ELSE regexp_replace(p_filiacao2_cpf, '\D', '', 'g')
    END,
    lower(trim(p_filiacao2_email)),
    p_filiacao2_celular,
    p_filiacao2_telefone_comercial,
    CASE WHEN p_cpf_crianca IS NOT NULL AND trim(p_cpf_crianca) != ''
         THEN regexp_replace(p_cpf_crianca, '\D', '', 'g')
         ELSE NULL END,
    p_certidao_nascimento,
    p_cep,
    p_logradouro,
    p_numero,
    p_complemento,
    p_bairro,
    p_cidade,
    p_estado,
    p_unidade_consumidora,
    p_forma_ocupacao_moradia,
    p_forma_ocupacao_moradia_outro,
    p_zona_atendimento_id,
    p_cmei1_preferencia,
    p_cmei2_preferencia,
    p_cmei3_preferencia,
    p_aceita_qualquer_cmei,
    p_programas_sociais,
    p_observacoes,
    p_responsavel_user_id,
    CASE
      WHEN p_canal_notificacao_preferido IS NULL OR length(trim(p_canal_notificacao_preferido)) = 0 THEN NULL
      ELSE lower(trim(p_canal_notificacao_preferido))
    END,
    'Fila de Espera'::status_crianca,
    v_prioridade
  )
  RETURNING id INTO v_crianca_id;

  INSERT INTO historico (crianca_id, acao, descricao, status_novo)
  VALUES (v_crianca_id, 'Inscrição Realizada', 'Inscrição realizada através do formulário público', 'Fila de Espera'::status_crianca);

  PERFORM recalcular_posicoes_fila();

  RETURN v_crianca_id;
END;
$$;

