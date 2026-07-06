ALTER TABLE public.configuracoes_sistema
ADD COLUMN IF NOT EXISTS apicpf_habilitado boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS apicpf_api_key text;

UPDATE public.configuracoes_sistema
SET apicpf_habilitado = false
WHERE apicpf_habilitado IS NULL;

DROP FUNCTION IF EXISTS public.get_public_configuracoes();

CREATE FUNCTION public.get_public_configuracoes()
RETURNS TABLE (
  nome_municipio text,
  nome_secretaria text,
  unidade_singular text,
  unidade_plural text,
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
  cpfhub_habilitado boolean,
  apicpf_habilitado boolean,
  idade_maxima_anos integer,
  idade_minima_meses integer,
  data_corte_mes integer,
  data_corte_dia integer,
  mensagem_idade_fora_faixa text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    nome_municipio,
    nome_secretaria,
    COALESCE(NULLIF(trim(unidade_singular), ''), 'CMEI') AS unidade_singular,
    COALESCE(NULLIF(trim(unidade_plural), ''), 'CMEIs') AS unidade_plural,
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
    coalesce(cpfhub_habilitado, false) AS cpfhub_habilitado,
    coalesce(apicpf_habilitado, false) AS apicpf_habilitado,
    idade_maxima_anos,
    idade_minima_meses,
    data_corte_mes,
    data_corte_dia,
    mensagem_idade_fora_faixa
  FROM configuracoes_sistema
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_configuracoes() TO anon, authenticated;
