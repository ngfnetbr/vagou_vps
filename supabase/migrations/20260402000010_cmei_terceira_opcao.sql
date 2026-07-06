ALTER TABLE public.configuracoes_sistema
ADD COLUMN IF NOT EXISTS preferencias_cmei_qtd integer NOT NULL DEFAULT 2 CHECK (preferencias_cmei_qtd IN (2,3));

ALTER TABLE public.criancas
ADD COLUMN IF NOT EXISTS cmei3_preferencia uuid NULL,
ADD COLUMN IF NOT EXISTS posicao_fila_cmei3 integer NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_schema = 'public'
      AND tc.table_name = 'criancas'
      AND tc.constraint_name = 'criancas_cmei3_preferencia_fkey'
  ) THEN
    ALTER TABLE public.criancas
    ADD CONSTRAINT criancas_cmei3_preferencia_fkey
    FOREIGN KEY (cmei3_preferencia) REFERENCES public.cmeis(id)
    ON DELETE SET NULL;
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
  preferencias_cmei_qtd integer
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
    coalesce(preferencias_cmei_qtd, 2) AS preferencias_cmei_qtd
  FROM configuracoes_sistema
  LIMIT 1;
$$;

DROP FUNCTION IF EXISTS public.inserir_inscricao_publica(
  text, date, text, text, text, text, text, text, text, text,
  text, text, text, text, text, text, text, uuid, uuid, boolean, boolean, text, uuid
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
  p_cmei3_preferencia uuid DEFAULT NULL
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

CREATE OR REPLACE FUNCTION public.recalcular_posicoes_fila()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  WITH configuracoes AS (
    SELECT 
      prioridade_social_habilitada,
      prioridade_remanejamento_habilitada,
      prioridade_zona_habilitada,
      prioridade_zona_bonus_dentro,
      prioridade_zona_bonus_fora
    FROM public.configuracoes_sistema
    LIMIT 1
  ),
  prioridades_somadas AS (
    SELECT 
      cp.crianca_id,
      SUM(tp.peso) AS peso_total
    FROM public.crianca_prioridades cp
    JOIN public.tipos_prioridade tp ON tp.id = cp.prioridade_id
    CROSS JOIN configuracoes cfg
    WHERE cp.status IN ('aprovado', 'pendente')
      AND tp.ativo = true
      AND (tp.codigo <> 'social' OR cfg.prioridade_social_habilitada = true)
    GROUP BY cp.crianca_id
  ),
  prioridade_remanejamento AS (
    SELECT 
      c.id as crianca_id,
      CASE 
        WHEN cfg.prioridade_remanejamento_habilitada AND c.prioridade = 'Remanejamento' THEN 100
        ELSE 0
      END as peso_remanejamento
    FROM public.criancas c
    CROSS JOIN configuracoes cfg
  ),
  bonus_zona AS (
    SELECT
      c.id AS crianca_id,
      CASE
        WHEN cfg.prioridade_zona_habilitada
          AND c.zona_atendimento_id IS NOT NULL
          AND c.cmei1_preferencia IS NOT NULL
        THEN
          CASE
            WHEN EXISTS (
              SELECT 1 FROM public.cmei_zonas cz
              WHERE cz.cmei_id = c.cmei1_preferencia
                AND cz.zona_id = c.zona_atendimento_id
            ) THEN cfg.prioridade_zona_bonus_dentro
            ELSE cfg.prioridade_zona_bonus_fora
          END
        ELSE 0
      END AS bonus_cmei1,
      CASE
        WHEN cfg.prioridade_zona_habilitada
          AND c.zona_atendimento_id IS NOT NULL
          AND c.cmei2_preferencia IS NOT NULL
        THEN
          CASE
            WHEN EXISTS (
              SELECT 1 FROM public.cmei_zonas cz
              WHERE cz.cmei_id = c.cmei2_preferencia
                AND cz.zona_id = c.zona_atendimento_id
            ) THEN cfg.prioridade_zona_bonus_dentro
            ELSE cfg.prioridade_zona_bonus_fora
          END
        ELSE 0
      END AS bonus_cmei2,
      CASE
        WHEN cfg.prioridade_zona_habilitada
          AND c.zona_atendimento_id IS NOT NULL
          AND c.cmei3_preferencia IS NOT NULL
        THEN
          CASE
            WHEN EXISTS (
              SELECT 1 FROM public.cmei_zonas cz
              WHERE cz.cmei_id = c.cmei3_preferencia
                AND cz.zona_id = c.zona_atendimento_id
            ) THEN cfg.prioridade_zona_bonus_dentro
            ELSE cfg.prioridade_zona_bonus_fora
          END
        ELSE 0
      END AS bonus_cmei3
    FROM public.criancas c
    CROSS JOIN configuracoes cfg
  ),
  ordered_children AS (
    SELECT 
      c.id,
      c.cmei1_preferencia,
      c.cmei2_preferencia,
      c.cmei3_preferencia,
      c.data_inscricao,
      ROW_NUMBER() OVER (
        PARTITION BY c.cmei1_preferencia 
        ORDER BY 
          COALESCE(ps.peso_total, 0) + COALESCE(pr.peso_remanejamento, 0) + COALESCE(bz.bonus_cmei1, 0) DESC,
          c.data_inscricao ASC
      ) as new_pos_cmei1,
      ROW_NUMBER() OVER (
        PARTITION BY c.cmei2_preferencia 
        ORDER BY 
          COALESCE(ps.peso_total, 0) + COALESCE(pr.peso_remanejamento, 0) + COALESCE(bz.bonus_cmei2, 0) DESC,
          c.data_inscricao ASC
      ) as new_pos_cmei2,
      ROW_NUMBER() OVER (
        PARTITION BY c.cmei3_preferencia 
        ORDER BY 
          COALESCE(ps.peso_total, 0) + COALESCE(pr.peso_remanejamento, 0) + COALESCE(bz.bonus_cmei3, 0) DESC,
          c.data_inscricao ASC
      ) as new_pos_cmei3
    FROM public.criancas c
    LEFT JOIN prioridades_somadas ps ON ps.crianca_id = c.id
    LEFT JOIN prioridade_remanejamento pr ON pr.crianca_id = c.id
    LEFT JOIN bonus_zona bz ON bz.crianca_id = c.id
    WHERE c.status IN ('Fila de Espera', 'Aguardando')
  )
  UPDATE public.criancas c
  SET 
    posicao_fila = CASE 
      WHEN c.cmei1_preferencia IS NOT NULL THEN oc.new_pos_cmei1
      ELSE NULL
    END,
    posicao_fila_cmei2 = CASE 
      WHEN c.cmei2_preferencia IS NOT NULL THEN oc.new_pos_cmei2
      ELSE NULL
    END,
    posicao_fila_cmei3 = CASE 
      WHEN c.cmei3_preferencia IS NOT NULL THEN oc.new_pos_cmei3
      ELSE NULL
    END,
    updated_at = now()
  FROM ordered_children oc
  WHERE c.id = oc.id;
END;
$function$;

