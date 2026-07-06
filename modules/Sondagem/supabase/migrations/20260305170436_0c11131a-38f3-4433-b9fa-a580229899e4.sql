-- Allow coordenadores to update solicitações status
CREATE POLICY "Coordenadores can update solicitacoes status"
ON public.solicitacoes_sondagem
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'coordenador'::app_role))
WITH CHECK (has_role(auth.uid(), 'coordenador'::app_role));