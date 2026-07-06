-- Criar tabela de histórico de alterações nos campos de inscrição
CREATE TABLE public.campos_inscricao_historico (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campo_id uuid REFERENCES public.campos_inscricao(id) ON DELETE SET NULL,
  operacao text NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  dados_anteriores jsonb,
  dados_novos jsonb,
  usuario_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.campos_inscricao_historico ENABLE ROW LEVEL SECURITY;

-- Apenas admin pode ver histórico
CREATE POLICY "Admin can view field history"
  ON public.campos_inscricao_historico
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Sistema pode inserir histórico
CREATE POLICY "System can insert field history"
  ON public.campos_inscricao_historico
  FOR INSERT
  WITH CHECK (true);

-- Criar função para registrar alterações
CREATE OR REPLACE FUNCTION public.log_campos_inscricao_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.campos_inscricao_historico (campo_id, operacao, dados_novos, usuario_id)
    VALUES (NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.campos_inscricao_historico (campo_id, operacao, dados_anteriores, dados_novos, usuario_id)
    VALUES (NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.campos_inscricao_historico (campo_id, operacao, dados_anteriores, usuario_id)
    VALUES (OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para registrar alterações
CREATE TRIGGER campos_inscricao_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.campos_inscricao
  FOR EACH ROW EXECUTE FUNCTION public.log_campos_inscricao_changes();

-- Inserir campo de exemplo para teste
INSERT INTO public.campos_inscricao (
  secao, nome_campo, label, tipo, placeholder, obrigatorio, ativo, ordem, 
  campo_sistema, visivel_responsavel, editavel_apos_inscricao, dica
) VALUES (
  'crianca', 
  'tipo_sanguineo', 
  'Tipo Sanguíneo', 
  'select', 
  'Selecione o tipo sanguíneo',
  false, 
  true, 
  100,
  false, 
  true, 
  true, 
  'Informação opcional para emergências'
);

-- Atualizar o campo com as opções de seleção
UPDATE public.campos_inscricao 
SET opcoes = '[
  {"value": "A+", "label": "A+"},
  {"value": "A-", "label": "A-"},
  {"value": "B+", "label": "B+"},
  {"value": "B-", "label": "B-"},
  {"value": "AB+", "label": "AB+"},
  {"value": "AB-", "label": "AB-"},
  {"value": "O+", "label": "O+"},
  {"value": "O-", "label": "O-"}
]'::jsonb
WHERE nome_campo = 'tipo_sanguineo';