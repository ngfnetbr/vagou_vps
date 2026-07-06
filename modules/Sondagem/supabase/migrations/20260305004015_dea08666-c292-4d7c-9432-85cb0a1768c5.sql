
-- Fix overly permissive insert policy on notificacoes
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notificacoes;
CREATE POLICY "Authenticated can insert notifications"
  ON public.notificacoes FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'equipe_pedagogica'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
