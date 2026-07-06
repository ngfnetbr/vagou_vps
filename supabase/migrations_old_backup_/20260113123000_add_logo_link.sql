
-- Adicionar coluna para o link do logo
ALTER TABLE public.configuracoes_sistema 
ADD COLUMN IF NOT EXISTS logo_empresa_link text DEFAULT 'https://hfgestaopublica.com.br/';

-- Atualizar função get_public_configuracoes para incluir o novo campo
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
  logo_empresa_link text, -- NOVO CAMPO
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
  endereco_longitude double precision
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
    logo_empresa_link, -- NOVO CAMPO
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
    endereco_longitude
  FROM configuracoes_sistema
  LIMIT 1;
$$;
