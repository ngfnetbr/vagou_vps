DROP POLICY IF EXISTS "Admin can insert profiles" ON public.profiles;
CREATE POLICY "Admin can insert profiles"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_admin(auth.uid())));

DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;
CREATE POLICY "Admin can update all profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT is_admin(auth.uid())))
  WITH CHECK ((SELECT is_admin(auth.uid())));

