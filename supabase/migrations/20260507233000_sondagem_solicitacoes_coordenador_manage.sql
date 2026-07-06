DROP POLICY IF EXISTS "Users can manage own solicitacoes" ON public.solicitacoes_sondagem;
CREATE POLICY "Users can manage own solicitacoes"
  ON public.solicitacoes_sondagem FOR ALL TO authenticated
  USING (
    solicitante_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    OR public.has_role(auth.uid(), 'coordenador'::text)
  )
  WITH CHECK (
    solicitante_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    OR public.has_role(auth.uid(), 'coordenador'::text)
  );
