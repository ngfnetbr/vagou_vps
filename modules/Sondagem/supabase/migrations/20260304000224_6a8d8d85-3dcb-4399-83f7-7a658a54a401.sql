
CREATE POLICY "Users can delete respostas for own sondagens"
ON public.respostas_sondagem
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM sondagens s
    WHERE s.id = respostas_sondagem.sondagem_id
    AND s.aplicador_id = auth.uid()
  )
);
