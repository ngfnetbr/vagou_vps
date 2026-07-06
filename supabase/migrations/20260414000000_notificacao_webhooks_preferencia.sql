ALTER TABLE public.configuracoes_sistema
ADD COLUMN IF NOT EXISTS webhook_url_notificacao_email text,
ADD COLUMN IF NOT EXISTS webhook_url_notificacao_sms text;

ALTER TABLE public.criancas
ADD COLUMN IF NOT EXISTS canal_notificacao_preferido text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'criancas_canal_notificacao_preferido_check'
  ) THEN
    ALTER TABLE public.criancas
      ADD CONSTRAINT criancas_canal_notificacao_preferido_check
      CHECK (
        canal_notificacao_preferido IS NULL
        OR canal_notificacao_preferido IN ('whatsapp', 'sms', 'email')
      );
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.get_public_configuracoes();

CREATE OR REPLACE FUNCTION public.get_public_configuracoes()
RETURNS TABLE (
  nome_municipio text,
  nome_secretaria text,
  email_contato text,
  telefone_contato text,
  brasao_url text,
  data_inicio_inscricao timestamp with time zone,
  data_fim_inscricao timestamp with time zone,
  prazo_resposta_dias integer,
  autenticacao_publica boolean,
  sistema_nome text,
  sistema_icone_url text,
  logo_empresa_url text,
  logo_empresa_link text,
  tema_cor_primaria text,
  tema_cor_secundaria text,
  tema_fonte text,
  tema_padrao text,
  app_nome text,
  app_icone_url text,
  app_playstore_url text,
  app_appstore_url text,
  modo_manutencao boolean,
  mensagem_manutencao text,
  bloquear_novas_inscricoes boolean,
  motivo_bloqueio_inscricoes text,
  captcha_habilitado boolean,
  captcha_site_key text,
  favicon_url text,
  permitir_troca_tema boolean,
  modo_demonstracao boolean,
  demo_mensagem text,
  endereco_secretaria text,
  endereco_latitude double precision,
  endereco_longitude double precision,
  habilitar_mensagens boolean,
  prioridades_comprovacao_na_inscricao boolean,
  prioridade_zona_habilitada boolean,
  prioridade_zona_bonus_dentro integer,
  prioridade_zona_bonus_fora integer,
  preferencias_cmei_qtd integer,
  notificacao_whatsapp_webhook_habilitado boolean,
  notificacao_sms_webhook_habilitado boolean,
  notificacao_email_webhook_habilitado boolean,
  cpfhub_habilitado boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    nome_municipio,
    nome_secretaria,
    email_contato,
    telefone_contato,
    brasao_url,
    data_inicio_inscricao,
    data_fim_inscricao,
    prazo_resposta_dias,
    autenticacao_publica,
    sistema_nome,
    sistema_icone_url,
    logo_empresa_url,
    logo_empresa_link,
    tema_cor_primaria,
    tema_cor_secundaria,
    tema_fonte,
    tema_padrao,
    app_nome,
    app_icone_url,
    app_playstore_url,
    app_appstore_url,
    modo_manutencao,
    mensagem_manutencao,
    bloquear_novas_inscricoes,
    motivo_bloqueio_inscricoes,
    captcha_habilitado,
    captcha_site_key,
    favicon_url,
    permitir_troca_tema,
    modo_demonstracao,
    demo_mensagem,
    endereco_secretaria,
    endereco_latitude,
    endereco_longitude,
    coalesce(habilitar_mensagens, true) AS habilitar_mensagens,
    prioridades_comprovacao_na_inscricao,
    coalesce(prioridade_zona_habilitada, false) AS prioridade_zona_habilitada,
    coalesce(prioridade_zona_bonus_dentro, 0) AS prioridade_zona_bonus_dentro,
    coalesce(prioridade_zona_bonus_fora, 0) AS prioridade_zona_bonus_fora,
    coalesce(preferencias_cmei_qtd, 2) AS preferencias_cmei_qtd,
    (coalesce(notificacao_whatsapp, false) AND webhook_url_notificacao IS NOT NULL AND length(trim(webhook_url_notificacao)) > 0) AS notificacao_whatsapp_webhook_habilitado,
    (coalesce(notificacao_sms, false) AND webhook_url_notificacao_sms IS NOT NULL AND length(trim(webhook_url_notificacao_sms)) > 0) AS notificacao_sms_webhook_habilitado,
    (coalesce(notificacao_email, false) AND webhook_url_notificacao_email IS NOT NULL AND length(trim(webhook_url_notificacao_email)) > 0) AS notificacao_email_webhook_habilitado,
    coalesce(cpfhub_habilitado, false) AS cpfhub_habilitado
  FROM configuracoes_sistema
  LIMIT 1;
$$;

DROP FUNCTION IF EXISTS public.inserir_inscricao_publica(
  text, date, text, text, text, text, text, text, text, text,
  text, text, text, text, text, text, text, uuid, uuid, boolean, boolean, text, uuid, uuid, uuid
);

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
    trim(p_responsavel_nome),
    v_cpf_limpo,
    p_responsavel_telefone,
    lower(trim(p_responsavel_email)),
    p_responsavel_celular,
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
