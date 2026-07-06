CREATE OR REPLACE FUNCTION public.set_role_permissoes(
  target_role public.app_role,
  permissao_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin')) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem gerenciar permissões.';
  END IF;

  IF target_role = 'superadmin' THEN
    RAISE EXCEPTION 'Não é possível alterar permissões do Super Admin.';
  END IF;

  DELETE FROM public.role_permissoes WHERE role = target_role;

  IF permissao_ids IS NOT NULL AND array_length(permissao_ids, 1) > 0 THEN
    INSERT INTO public.role_permissoes (role, permissao_id, created_by)
    SELECT DISTINCT target_role, p_id, auth.uid()
    FROM unnest(permissao_ids) AS p_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_role_permissoes(public.app_role, uuid[]) TO authenticated;
