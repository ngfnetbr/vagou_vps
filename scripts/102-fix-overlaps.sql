-- Fix overlapping policies for 'profiles' and 'historico'

-- 1. profiles (SELECT)
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "View profiles" ON public.profiles
FOR SELECT TO public
USING (
  (SELECT is_admin((SELECT auth.uid()))) 
  OR 
  ((SELECT auth.uid()) = id)
);

-- 2. historico (INSERT)
-- Merging:
-- "Public can insert inscription history" (acao = 'Inscrição Realizada')
-- "Responsavel can insert history for own children" (parent logic)
-- "Admin can manage history" (is_admin - implied overlap for INSERT)

DROP POLICY IF EXISTS "Public can insert inscription history" ON public.historico;
DROP POLICY IF EXISTS "Responsavel can insert history for own children" ON public.historico;
DROP POLICY IF EXISTS "Responsavel can insert own messages" ON public.historico; -- Typo in my thought? No, it was 'Responsavel can insert history...'

-- Note: 'Admin can manage history' is ALL. We need to split it or handle overlaps.
-- If we keep 'Admin can manage history' as ALL, it overlaps with specific INSERT/SELECT policies.
-- Best practice: Split 'Admin can manage history' into specific actions if we have other policies for those actions.
-- Or just make one big policy for everything? No, logic differs per action.

DROP POLICY IF EXISTS "Admin can manage history" ON public.historico;

-- Re-create Admin policies for UPDATE/DELETE (exclusive to admin usually, or shared?)
-- 'Responsavel' doesn't seem to have UPDATE/DELETE on historico in the list I saw?
-- Let's check the list:
-- "Responsavel can insert history..."
-- "Responsavel can view..."
-- No UPDATE/DELETE for Responsavel.
-- So Admin can keep exclusive UPDATE/DELETE.

CREATE POLICY "Admin manage history" ON public.historico
FOR DELETE TO public
USING ((SELECT is_admin((SELECT auth.uid()))));

CREATE POLICY "Admin update history" ON public.historico
FOR UPDATE TO public
USING ((SELECT is_admin((SELECT auth.uid()))))
WITH CHECK ((SELECT is_admin((SELECT auth.uid()))));

-- Now Shared Actions: SELECT and INSERT

-- SELECT: Admin OR Parent
DROP POLICY IF EXISTS "Responsavel can view own children history" ON public.historico;

CREATE POLICY "View history" ON public.historico
FOR SELECT TO public
USING (
  (SELECT is_admin((SELECT auth.uid())))
  OR
  (EXISTS (
    SELECT 1 FROM criancas
    WHERE criancas.id = historico.crianca_id
    AND criancas.responsavel_user_id = (SELECT auth.uid())
  ))
);

-- INSERT: Admin OR Parent OR Public Inscription
CREATE POLICY "Insert history" ON public.historico
FOR INSERT TO public
WITH CHECK (
  (SELECT is_admin((SELECT auth.uid())))
  OR
  (acao = 'Inscrição Realizada')
  OR
  (EXISTS (
    SELECT 1 FROM criancas
    WHERE criancas.id = historico.crianca_id
    AND criancas.responsavel_user_id = (SELECT auth.uid())
  ))
);
