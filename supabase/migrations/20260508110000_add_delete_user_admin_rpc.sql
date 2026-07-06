-- Function to allow admins to delete users
CREATE OR REPLACE FUNCTION public.delete_user_admin(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  executor_role text;
BEGIN
  SELECT role INTO executor_role
  FROM public.user_roles
  WHERE user_id = auth.uid()
    AND role IN ('admin', 'superadmin')
  LIMIT 1;

  IF executor_role IS NULL THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem excluir usuários.';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode excluir sua própria conta.';
  END IF;

  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_admin(uuid) TO authenticated;
