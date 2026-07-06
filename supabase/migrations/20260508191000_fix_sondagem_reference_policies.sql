DROP POLICY IF EXISTS "Authenticated users can read periodos" ON public.periodos;
CREATE POLICY "Authenticated users can read periodos"
  ON public.periodos FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage periodos" ON public.periodos;
CREATE POLICY "Admins can manage periodos"
  ON public.periodos FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'gestor'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'gestor'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  );

DROP POLICY IF EXISTS "Authenticated users can read niveis" ON public.niveis_aprendizagem;
CREATE POLICY "Authenticated users can read niveis"
  ON public.niveis_aprendizagem FOR SELECT TO authenticated
  USING (true);

