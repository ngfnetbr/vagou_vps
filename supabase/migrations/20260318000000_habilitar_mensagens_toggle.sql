-- Adiciona flag para habilitar/desabilitar Mensagens (chat) no sistema
ALTER TABLE public.configuracoes_sistema
ADD COLUMN IF NOT EXISTS habilitar_mensagens boolean DEFAULT true;

UPDATE public.configuracoes_sistema
SET habilitar_mensagens = true
WHERE habilitar_mensagens IS NULL;

-- Expor flag nas configurações públicas
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
  habilitar_mensagens boolean
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
    coalesce(habilitar_mensagens, true) AS habilitar_mensagens
  FROM configuracoes_sistema
  LIMIT 1;
$$;

-- RLS: chat só funciona quando habilitado nas configurações
DROP POLICY IF EXISTS "View chat messages" ON public.chat_mensagens;
DROP POLICY IF EXISTS "Insert chat messages" ON public.chat_mensagens;
DROP POLICY IF EXISTS "Manage chat messages" ON public.chat_mensagens;

CREATE POLICY "View chat messages"
ON public.chat_mensagens
FOR SELECT
USING (
  coalesce((SELECT configuracoes_sistema.habilitar_mensagens FROM public.configuracoes_sistema LIMIT 1), true)
  AND (
    (SELECT is_admin(auth.uid()))
    OR (responsavel_id = (SELECT auth.uid()))
  )
);

CREATE POLICY "Insert chat messages"
ON public.chat_mensagens
FOR INSERT
WITH CHECK (
  coalesce((SELECT configuracoes_sistema.habilitar_mensagens FROM public.configuracoes_sistema LIMIT 1), true)
  AND (
    (SELECT is_admin(auth.uid()))
    OR (responsavel_id = (SELECT auth.uid()) AND direcao = 'responsavel')
  )
);

CREATE POLICY "Manage chat messages"
ON public.chat_mensagens
FOR ALL
USING (
  coalesce((SELECT configuracoes_sistema.habilitar_mensagens FROM public.configuracoes_sistema LIMIT 1), true)
  AND (SELECT is_admin(auth.uid()))
)
WITH CHECK (
  coalesce((SELECT configuracoes_sistema.habilitar_mensagens FROM public.configuracoes_sistema LIMIT 1), true)
  AND (SELECT is_admin(auth.uid()))
);

DROP POLICY IF EXISTS "View chat config" ON public.chat_conversas_config;
DROP POLICY IF EXISTS "Insert chat config" ON public.chat_conversas_config;
DROP POLICY IF EXISTS "Manage chat config" ON public.chat_conversas_config;

CREATE POLICY "View chat config"
ON public.chat_conversas_config
FOR SELECT
USING (
  coalesce((SELECT configuracoes_sistema.habilitar_mensagens FROM public.configuracoes_sistema LIMIT 1), true)
  AND (
    (SELECT is_admin(auth.uid()))
    OR (responsavel_id = (SELECT auth.uid()))
  )
);

CREATE POLICY "Insert chat config"
ON public.chat_conversas_config
FOR INSERT
WITH CHECK (
  coalesce((SELECT configuracoes_sistema.habilitar_mensagens FROM public.configuracoes_sistema LIMIT 1), true)
  AND (
    (SELECT is_admin(auth.uid()))
    OR (responsavel_id = (SELECT auth.uid()))
  )
);

CREATE POLICY "Manage chat config"
ON public.chat_conversas_config
FOR ALL
USING (
  coalesce((SELECT configuracoes_sistema.habilitar_mensagens FROM public.configuracoes_sistema LIMIT 1), true)
  AND (SELECT is_admin(auth.uid()))
)
WITH CHECK (
  coalesce((SELECT configuracoes_sistema.habilitar_mensagens FROM public.configuracoes_sistema LIMIT 1), true)
  AND (SELECT is_admin(auth.uid()))
);
