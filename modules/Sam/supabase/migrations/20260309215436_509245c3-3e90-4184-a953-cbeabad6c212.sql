
-- Webhooks table (new, separate from webhook_configs)
CREATE TABLE public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  url text NOT NULL,
  metodo text NOT NULL DEFAULT 'POST' CHECK (metodo IN ('POST', 'GET')),
  evento text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  headers jsonb DEFAULT '{}'::jsonb,
  body_template jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Webhooks viewable by authenticated" ON public.webhooks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage webhooks" ON public.webhooks
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Webhook execution logs
CREATE TABLE public.webhooks_exec_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid REFERENCES public.webhooks(id) ON DELETE CASCADE NOT NULL,
  evento text NOT NULL,
  payload_enviado jsonb NOT NULL,
  resposta text,
  status_http integer,
  executado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhooks_exec_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Logs viewable by authenticated" ON public.webhooks_exec_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert logs" ON public.webhooks_exec_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- Add RLS policies for schools CRUD (currently missing INSERT/UPDATE/DELETE)
CREATE POLICY "Admins can insert schools" ON public.schools
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'professional')));

CREATE POLICY "Admins can update schools" ON public.schools
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'professional')));

CREATE POLICY "Admins can delete schools" ON public.schools
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Drop and recreate students_unified view to include local students
DROP VIEW IF EXISTS public.students_unified;

CREATE OR REPLACE VIEW public.students_unified AS
  -- Local students (priority)
  SELECT 
    s.id,
    s.full_name AS nome,
    s.birth_date AS data_nascimento,
    sc.name AS cmei_atual_nome,
    s.class_name AS turma_atual_nome,
    s.guardian_name AS nome_responsavel,
    NULL::text AS responsavel_telefone,
    'local'::text AS source
  FROM students s
  LEFT JOIN schools sc ON sc.id = s.school_id

  UNION ALL

  -- Cache students (only those NOT in local)
  SELECT 
    c.id,
    c.nome,
    c.data_nascimento,
    c.cmei_atual_nome,
    c.turma_atual_nome,
    c.nome_responsavel,
    c.responsavel_telefone,
    'cache'::text AS source
  FROM criancas_cache c
  WHERE c.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM students s WHERE s.id = c.id
    );
