-- Corrige RLS do vínculo Diretor ↔ CMEI (permite gestão por admin/gestor/superadmin)

DROP POLICY IF EXISTS "View director bindings" ON public.diretor_cmei_vinculo;
CREATE POLICY "View director bindings"
  ON public.diretor_cmei_vinculo
  FOR SELECT
  USING (is_admin(auth.uid()) OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin write director bindings" ON public.diretor_cmei_vinculo;
CREATE POLICY "Admin write director bindings"
  ON public.diretor_cmei_vinculo
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin update director bindings" ON public.diretor_cmei_vinculo;
CREATE POLICY "Admin update director bindings"
  ON public.diretor_cmei_vinculo
  FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin delete director bindings" ON public.diretor_cmei_vinculo;
CREATE POLICY "Admin delete director bindings"
  ON public.diretor_cmei_vinculo
  FOR DELETE
  USING (is_admin(auth.uid()));
