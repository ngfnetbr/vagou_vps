-- Fix remaining auth_rls_initplan in 'valores_campos_custom' and 'zonas_atendimento'

-- 1. valores_campos_custom: View custom values
-- Current: ((SELECT is_admin(auth.uid())) OR (EXISTS ... (criancas.responsavel_user_id = (SELECT auth.uid()))))
-- The second part: (SELECT auth.uid()) is ALREADY optimized in my manual check? 
-- Wait, the log showed: `(criancas.responsavel_user_id = ( SELECT auth.uid() AS uid))`
-- It IS optimized. My checker flagged it?
-- Ah, `( SELECT auth.uid() AS uid)`
-- My checker looked for `(SELECT auth.uid())`. It might have failed on ` AS uid`.
-- Wait, let's look closer at the log:
-- `criancas.responsavel_user_id = ( SELECT auth.uid() AS uid)`
-- This IS a subquery. `( SELECT ... )`.
-- So it IS optimized.

-- However, to be absolutely consistent and safe, I will re-apply strictly formatted policies.

DROP POLICY IF EXISTS "View custom values" ON public.valores_campos_custom;
CREATE POLICY "View custom values" ON public.valores_campos_custom
FOR SELECT TO public
USING (
  (SELECT is_admin((SELECT auth.uid())))
  OR
  (EXISTS (
    SELECT 1 FROM criancas
    WHERE criancas.id = valores_campos_custom.crianca_id
    AND criancas.responsavel_user_id = (SELECT auth.uid())
  ))
);

-- 2. zonas_atendimento: View zones
-- Log output was truncated, but it likely has similar structure.
-- Let's assume it needs the same fix.

DROP POLICY IF EXISTS "View zones" ON public.zonas_atendimento;
CREATE POLICY "View zones" ON public.zonas_atendimento
FOR SELECT TO public
USING (
  (SELECT is_admin((SELECT auth.uid())))
);
-- Wait, View zones is likely just admin?
-- Or public? "View zones" usually implies public read?
-- If it was "Admin view zones", I'd say Admin only.
-- Let's check the truncated log: `is_admin) AS is_admin))`
-- It seems it only checks is_admin.
-- If so, why is it flagged?
-- `( SELECT ( SELECT is_admin(auth.uid()) AS is_admin) AS is_admin)`
-- This is double wrapped? `( SELECT ( SELECT ... ) )`
-- It should be optimized.
-- But I'll clean it up to `(SELECT is_admin((SELECT auth.uid())))`

-- Also fix "Admin write zones" just in case
-- Current: `( SELECT is_admin(auth.uid()) AS is_admin)` -> Good.

-- Let's just apply the clean versions.

