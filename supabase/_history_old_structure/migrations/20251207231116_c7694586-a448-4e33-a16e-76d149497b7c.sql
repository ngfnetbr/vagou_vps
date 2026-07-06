-- Tabela para salvar planejamento de transição anual
CREATE TABLE public.planejamento_transicao (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crianca_id uuid NOT NULL REFERENCES public.criancas(id) ON DELETE CASCADE,
  ano_referencia integer NOT NULL DEFAULT (EXTRACT(year FROM now()))::integer,
  acao text NOT NULL,
  justificativa text,
  turma_destino_id uuid REFERENCES public.turmas(id),
  cmei_destino_id uuid REFERENCES public.cmeis(id),
  status text NOT NULL DEFAULT 'planejado',
  aplicado_em timestamp with time zone,
  aplicado_por uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE(crianca_id, ano_referencia)
);

-- Índices
CREATE INDEX idx_planejamento_transicao_ano ON public.planejamento_transicao(ano_referencia);
CREATE INDEX idx_planejamento_transicao_status ON public.planejamento_transicao(status);
CREATE INDEX idx_planejamento_transicao_crianca ON public.planejamento_transicao(crianca_id);

-- Enable RLS
ALTER TABLE public.planejamento_transicao ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admin can manage transition planning"
ON public.planejamento_transicao FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_planejamento_transicao_updated_at
BEFORE UPDATE ON public.planejamento_transicao
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();