CREATE TABLE IF NOT EXISTS public.user_permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permissao_id uuid NOT NULL REFERENCES public.permissoes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  UNIQUE(user_id, permissao_id)
);

ALTER TABLE public.user_permissoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own user permissions" ON public.user_permissoes;
CREATE POLICY "Users can view own user permissions"
  ON public.user_permissoes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'superadmin'::public.app_role));

DROP POLICY IF EXISTS "Admin can manage user permissions" ON public.user_permissoes;
CREATE POLICY "Admin can manage user permissions"
  ON public.user_permissoes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'superadmin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'superadmin'::public.app_role));
