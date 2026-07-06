
CREATE TABLE public.metas_sondagem (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo_codigo TEXT NOT NULL,
  turma_tipo TEXT, -- ex: "infantil_5", "infantil_4", null = todas
  tipo TEXT NOT NULL DEFAULT 'escrita', -- escrita ou producao_texto
  nivel_codigo TEXT NOT NULL, -- código do nível esperado (ex: "N2", "SIL")
  descricao TEXT, -- descrição livre da meta
  obrigatoria BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.metas_sondagem ENABLE ROW LEVEL SECURITY;

-- Equipe pedagógica e admin podem gerenciar
CREATE POLICY "Equipe and admin can manage metas"
  ON public.metas_sondagem
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'equipe_pedagogica'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'equipe_pedagogica'::app_role));

-- Todos autenticados podem ler
CREATE POLICY "Authenticated can read metas"
  ON public.metas_sondagem
  FOR SELECT
  TO authenticated
  USING (true);
