-- Criar tabela para log de notificações
CREATE TABLE public.notificacoes_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crianca_id UUID REFERENCES public.criancas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- 'convocacao', 'matricula', 'remanejamento', 'lembrete'
  canal TEXT NOT NULL, -- 'email', 'sms', 'whatsapp'
  status TEXT NOT NULL, -- 'sucesso', 'falha', 'pendente'
  destinatario_nome TEXT,
  destinatario_contato TEXT, -- email, telefone, etc
  payload JSONB,
  resposta JSONB,
  erro TEXT,
  tentativas INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notificacoes_log ENABLE ROW LEVEL SECURITY;

-- Policy: Admin pode ver todos os logs
CREATE POLICY "Admin can view all notification logs"
ON public.notificacoes_log
FOR SELECT
USING (is_admin(auth.uid()));

-- Policy: Admin pode inserir logs (edge function usa service role)
CREATE POLICY "Admin can insert notification logs"
ON public.notificacoes_log
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Criar índices para melhorar performance
CREATE INDEX idx_notificacoes_log_crianca_id ON public.notificacoes_log(crianca_id);
CREATE INDEX idx_notificacoes_log_tipo ON public.notificacoes_log(tipo);
CREATE INDEX idx_notificacoes_log_canal ON public.notificacoes_log(canal);
CREATE INDEX idx_notificacoes_log_status ON public.notificacoes_log(status);
CREATE INDEX idx_notificacoes_log_created_at ON public.notificacoes_log(created_at DESC);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_notificacoes_log_updated_at
BEFORE UPDATE ON public.notificacoes_log
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.notificacoes_log IS 'Log de todas as notificações enviadas pelo sistema';
COMMENT ON COLUMN public.notificacoes_log.tipo IS 'Tipo de notificação: convocacao, matricula, remanejamento, lembrete';
COMMENT ON COLUMN public.notificacoes_log.canal IS 'Canal de envio: email, sms, whatsapp';
COMMENT ON COLUMN public.notificacoes_log.status IS 'Status do envio: sucesso, falha, pendente';