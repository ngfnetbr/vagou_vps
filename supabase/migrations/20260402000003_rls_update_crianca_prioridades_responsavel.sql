DROP POLICY IF EXISTS "Update child priorities" ON public.crianca_prioridades;

CREATE POLICY "Update child priorities"
ON public.crianca_prioridades
FOR UPDATE
USING (
  (SELECT is_admin(auth.uid())) OR
  (
    status IN ('pendente', 'recusado') AND
    EXISTS (
      SELECT 1
      FROM public.criancas
      WHERE criancas.id = crianca_prioridades.crianca_id
        AND criancas.responsavel_user_id = (SELECT auth.uid())
    )
  )
)
WITH CHECK (
  (SELECT is_admin(auth.uid())) OR
  (
    status IN ('pendente', 'recusado') AND
    EXISTS (
      SELECT 1
      FROM public.criancas
      WHERE criancas.id = crianca_prioridades.crianca_id
        AND criancas.responsavel_user_id = (SELECT auth.uid())
    )
  )
);
