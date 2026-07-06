-- Drop restrictive policies
DROP POLICY IF EXISTS "Authenticated users can read cache_criancas" ON public.cache_criancas;
DROP POLICY IF EXISTS "Admins can manage cache_criancas" ON public.cache_criancas;

-- Recreate as PERMISSIVE
CREATE POLICY "Authenticated users can read cache_criancas"
  ON public.cache_criancas
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage cache_criancas"
  ON public.cache_criancas
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
