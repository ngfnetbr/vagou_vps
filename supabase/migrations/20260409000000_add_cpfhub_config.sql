ALTER TABLE public.configuracoes_sistema
ADD COLUMN IF NOT EXISTS cpfhub_habilitado boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS cpfhub_api_key text;

UPDATE public.configuracoes_sistema
SET cpfhub_habilitado = false
WHERE cpfhub_habilitado IS NULL;

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
    coalesce(cpfhub_habilitado, false) AS cpfhub_habilitado
  FROM configuracoes_sistema
  LIMIT 1;
$$;

