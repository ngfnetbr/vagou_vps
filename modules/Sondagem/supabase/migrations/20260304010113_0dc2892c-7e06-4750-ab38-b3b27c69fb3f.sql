
-- Tabela de períodos
CREATE TABLE public.periodos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  codigo text NOT NULL UNIQUE,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.periodos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read periodos"
  ON public.periodos FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage periodos"
  ON public.periodos FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Inserir períodos padrão
INSERT INTO public.periodos (codigo, nome) VALUES
  ('2025-1', '2025 - 1º Semestre'),
  ('2025-2', '2025 - 2º Semestre'),
  ('2026-1', '2026 - 1º Semestre');

-- Tabela de auditoria
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  user_email text,
  acao text NOT NULL,
  tabela text NOT NULL,
  registro_id text,
  dados_antes jsonb,
  dados_depois jsonb,
  detalhes text,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit_logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can insert audit_logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
