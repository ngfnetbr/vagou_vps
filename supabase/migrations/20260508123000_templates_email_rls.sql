CREATE TABLE IF NOT EXISTS public.templates_email (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  titulo text NOT NULL,
  descricao text,
  assunto_email text,
  corpo_email text,
  variaveis_disponiveis jsonb DEFAULT '[]'::jsonb,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.templates_email ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view email templates" ON public.templates_email;
CREATE POLICY "Admin can view email templates"
  ON public.templates_email
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

DROP POLICY IF EXISTS "Admin can manage email templates" ON public.templates_email;
CREATE POLICY "Admin can manage email templates"
  ON public.templates_email
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));
