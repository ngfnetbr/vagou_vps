-- Remover política que expõe tudo publicamente
DROP POLICY IF EXISTS "Anyone can read configurations" ON public.configuracoes_sistema;

-- Criar função segura que retorna apenas campos públicos (sem secrets)
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
  demo_mensagem text
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
    demo_mensagem
  FROM configuracoes_sistema
  LIMIT 1
$$;

-- Criar política que permite leitura completa apenas para admins
CREATE POLICY "Admins can read all configurations"
ON public.configuracoes_sistema
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
);

-- Garantir que a política de update continua funcionando
DROP POLICY IF EXISTS "Admin can update configurations" ON public.configuracoes_sistema;
CREATE POLICY "Admin can update configurations"
ON public.configuracoes_sistema
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));