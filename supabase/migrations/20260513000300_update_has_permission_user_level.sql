CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH module_codes AS (
    SELECT unnest(ARRAY[
      'modulos.vagou.acessar'::text,
      'modulos.sam.acessar'::text,
      'modulos.sondagem.acessar'::text
    ]) AS codigo
  ),
  user_module_configured AS (
    SELECT EXISTS (
      SELECT 1
      FROM public.user_permissoes up
      JOIN public.permissoes p ON p.id = up.permissao_id
      JOIN module_codes mc ON mc.codigo = p.codigo
      WHERE up.user_id = _user_id
    ) AS configured
  ),
  role_based AS (
    SELECT EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissoes rp ON ur.role = rp.role
      JOIN public.permissoes p ON rp.permissao_id = p.id
      WHERE ur.user_id = _user_id AND p.codigo = _permission_code
    ) AS ok
  ),
  user_based AS (
    SELECT EXISTS (
      SELECT 1
      FROM public.user_permissoes up
      JOIN public.permissoes p ON up.permissao_id = p.id
      WHERE up.user_id = _user_id AND p.codigo = _permission_code
    ) AS ok
  )
  SELECT
    CASE
      WHEN has_role(_user_id, 'superadmin') THEN true
      WHEN _permission_code IN (SELECT codigo FROM module_codes) THEN
        CASE
          WHEN (SELECT configured FROM user_module_configured) THEN (SELECT ok FROM user_based)
          ELSE (SELECT ok FROM role_based) OR (SELECT ok FROM user_based)
        END
      ELSE (SELECT ok FROM role_based) OR (SELECT ok FROM user_based)
    END
$$;
