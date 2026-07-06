
CREATE TABLE public.anotacoes_aluno (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crianca_id uuid NOT NULL REFERENCES public.cache_criancas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_nome text,
  texto text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.anotacoes_aluno ENABLE ROW LEVEL SECURITY;

-- Admin and equipe can manage
CREATE POLICY "Admin and equipe can manage anotacoes"
  ON public.anotacoes_aluno FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'equipe_pedagogica'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'equipe_pedagogica'::app_role));

-- All authenticated can read
CREATE POLICY "Authenticated can read anotacoes"
  ON public.anotacoes_aluno FOR SELECT
  TO authenticated
  USING (true);
