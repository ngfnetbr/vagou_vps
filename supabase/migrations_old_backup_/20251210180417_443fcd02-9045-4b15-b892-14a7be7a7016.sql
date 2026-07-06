-- Atualizar política de auditoria para incluir anon
DROP POLICY IF EXISTS "System can insert audit logs" ON public.auditoria;
CREATE POLICY "System can insert audit logs"
ON public.auditoria
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Atualizar política de histórico para incluir anon
DROP POLICY IF EXISTS "Public can insert inscription history" ON public.historico;
CREATE POLICY "Public can insert inscription history"
ON public.historico
FOR INSERT
TO anon, authenticated
WITH CHECK (acao = 'Inscrição Realizada');

-- Atualizar política de crianca_prioridades para incluir anon
DROP POLICY IF EXISTS "Public can insert child priorities" ON public.crianca_prioridades;
CREATE POLICY "Public can insert child priorities"
ON public.crianca_prioridades
FOR INSERT
TO anon, authenticated
WITH CHECK (true);