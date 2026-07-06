
-- Tabela de controle de sincronização incremental
CREATE TABLE public.sync_controle (
  entidade text PRIMARY KEY,
  ultima_sincronizacao timestamptz NOT NULL DEFAULT '1970-01-01T00:00:00Z',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sync_controle ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sync_controle"
  ON public.sync_controle FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gestores can read sync_controle"
  ON public.sync_controle FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'gestor'::app_role));

-- Seed initial row
INSERT INTO public.sync_controle (entidade) VALUES ('criancas') ON CONFLICT DO NOTHING;
