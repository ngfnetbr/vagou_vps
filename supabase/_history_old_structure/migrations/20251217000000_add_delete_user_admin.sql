-- Function to delete a user by admin
-- This function is intended to be called by admins to delete a user from auth.users
CREATE OR REPLACE FUNCTION public.delete_user_admin(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the caller is an admin or superadmin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'superadmin')
  ) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem excluir usuários.';
  END IF;

  -- Delete the user from auth.users
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;
