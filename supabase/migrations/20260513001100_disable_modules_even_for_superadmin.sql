CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH module_codes AS (
    SELECT unnest(ARRAY[
      'modulos.vagou.acessar',
      'modulos.sam.acessar',
      'modulos.sondagem.acessar'
    ]) AS codigo
  ),
  cfg AS (
    SELECT
      coalesce((SELECT configuracoes_sistema.habilitar_sam FROM public.configuracoes_sistema LIMIT 1), true) AS habilitar_sam,
      coalesce((SELECT configuracoes_sistema.habilitar_sondagem FROM public.configuracoes_sistema LIMIT 1), true) AS habilitar_sondagem
  ),
  user_module_configured AS (
    SELECT EXISTS (
      SELECT 1
      FROM public.user_permissoes up
      JOIN public.permissoes p ON p.id = up.permissao_id
      WHERE up.user_id = _user_id AND p.codigo IN (SELECT codigo FROM module_codes)
    ) AS configured
  ),
  role_based AS (
    SELECT EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissoes rp ON rp.role = ur.role
      JOIN public.permissoes p ON p.id = rp.permissao_id
      WHERE ur.user_id = _user_id AND p.codigo = _permission_code
    ) AS ok
  ),
  user_based AS (
    SELECT EXISTS (
      SELECT 1
      FROM public.user_permissoes up
      JOIN public.permissoes p ON p.id = up.permissao_id
      WHERE up.user_id = _user_id AND p.codigo = _permission_code
    ) AS ok
  )
  SELECT CASE
    WHEN _permission_code = 'modulos.sam.acessar' AND NOT (SELECT habilitar_sam FROM cfg) THEN false
    WHEN _permission_code = 'modulos.sondagem.acessar' AND NOT (SELECT habilitar_sondagem FROM cfg) THEN false
    WHEN public.has_role(_user_id, 'superadmin'::public.app_role) THEN true
    WHEN _permission_code IN ('modulos.sam.acessar', 'modulos.sondagem.acessar')
      AND public.has_role(_user_id, 'responsavel'::public.app_role)
      AND NOT (
        public.has_role(_user_id, 'admin'::public.app_role)
        OR public.has_role(_user_id, 'superadmin'::public.app_role)
        OR public.has_role(_user_id, 'gestor'::public.app_role)
        OR public.has_role(_user_id, 'diretor_cmei'::public.app_role)
      )
      THEN false
    WHEN _permission_code IN (SELECT codigo FROM module_codes) THEN
      CASE
        WHEN (SELECT configured FROM user_module_configured) THEN (SELECT ok FROM user_based)
        ELSE (SELECT ok FROM role_based) OR (SELECT ok FROM user_based)
      END
    ELSE (SELECT ok FROM role_based) OR (SELECT ok FROM user_based)
  END;
$$;
