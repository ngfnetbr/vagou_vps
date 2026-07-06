-- Criar tabela para modelos de turmas base
CREATE TABLE public.turmas_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  idade_minima_meses INTEGER NOT NULL,
  idade_maxima_meses INTEGER NOT NULL,
  descricao TEXT,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT idade_valida CHECK (idade_maxima_meses >= idade_minima_meses)
);

-- Enable RLS
ALTER TABLE public.turmas_base ENABLE ROW LEVEL SECURITY;

-- Policy: Qualquer um pode visualizar turmas base ativas
CREATE POLICY "Anyone can view active base classes"
ON public.turmas_base
FOR SELECT
USING (ativo = true);

-- Policy: Admin pode gerenciar todas as turmas base
CREATE POLICY "Admin can manage base classes"
ON public.turmas_base
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Criar índices
CREATE INDEX idx_turmas_base_ordem ON public.turmas_base(ordem);
CREATE INDEX idx_turmas_base_ativo ON public.turmas_base(ativo);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_turmas_base_updated_at
BEFORE UPDATE ON public.turmas_base
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir turmas base padrão
INSERT INTO public.turmas_base (nome, idade_minima_meses, idade_maxima_meses, descricao, ordem) VALUES
('Infantil 0', 0, 11, '0 anos na data de corte (31/03)', 1),
('Infantil 1', 12, 23, '1 ano na data de corte (31/03)', 2),
('Infantil 2', 24, 35, '2 anos na data de corte (31/03)', 3),
('Infantil 3', 36, 47, '3 anos na data de corte (31/03)', 4),
('Pré I', 48, 59, '4 anos na data de corte (31/03)', 5),
('Pré II', 60, 71, '5 anos na data de corte (31/03)', 6);

-- Comentários
COMMENT ON TABLE public.turmas_base IS 'Modelos de turmas com faixas etárias padrão do município';
COMMENT ON COLUMN public.turmas_base.idade_minima_meses IS 'Idade mínima em meses para a turma';
COMMENT ON COLUMN public.turmas_base.idade_maxima_meses IS 'Idade máxima em meses para a turma';
COMMENT ON COLUMN public.turmas_base.ordem IS 'Ordem de exibição das turmas';