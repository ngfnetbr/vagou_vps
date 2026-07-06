-- Remover política existente e recriar com role anon explícito
DROP POLICY IF EXISTS "Public can insert inscriptions" ON public.criancas;

-- Política permissiva para INSERT público (inclui anon e authenticated)
CREATE POLICY "Public can insert inscriptions"
ON public.criancas
FOR INSERT
TO anon, authenticated
WITH CHECK (true);