DROP POLICY IF EXISTS "Only admin can view audit logs" ON public.auditoria;
DROP POLICY IF EXISTS "Admin can view audit logs" ON public.auditoria;

CREATE POLICY "Admin can view audit logs"
  ON public.auditoria FOR SELECT
  USING (is_admin(auth.uid()));
