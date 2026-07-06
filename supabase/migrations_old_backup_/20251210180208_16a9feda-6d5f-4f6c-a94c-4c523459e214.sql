-- Permitir INSERT na tabela de auditoria para o trigger funcionar
-- O trigger audit_trigger_function é SECURITY DEFINER, mas ainda precisa de política
CREATE POLICY "System can insert audit logs"
ON public.auditoria
FOR INSERT
WITH CHECK (true);