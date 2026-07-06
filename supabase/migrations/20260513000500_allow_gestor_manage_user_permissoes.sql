DROP POLICY IF EXISTS "Users can view own user permissions" ON public.user_permissoes;
CREATE POLICY "Users can view own user permissions"
  ON public.user_permissoes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin can manage user permissions" ON public.user_permissoes;
DROP POLICY IF EXISTS "Staff can manage user permissions" ON public.user_permissoes;
CREATE POLICY "Staff can manage user permissions"
  ON public.user_permissoes FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
