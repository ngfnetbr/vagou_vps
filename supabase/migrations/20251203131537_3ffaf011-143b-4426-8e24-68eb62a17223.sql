-- Criar tabela para mensagens de chat
CREATE TABLE public.chat_mensagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crianca_id UUID REFERENCES public.criancas(id) ON DELETE CASCADE,
  responsavel_telefone TEXT NOT NULL,
  responsavel_nome TEXT,
  direcao TEXT NOT NULL CHECK (direcao IN ('enviada', 'recebida')),
  conteudo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto', 'imagem', 'documento', 'audio')),
  arquivo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'entregue', 'lido', 'erro')),
  erro TEXT,
  webhook_message_id TEXT,
  enviado_por UUID REFERENCES auth.users(id),
  lida_em TIMESTAMP WITH TIME ZONE,
  lida_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_chat_mensagens_crianca ON public.chat_mensagens(crianca_id);
CREATE INDEX idx_chat_mensagens_telefone ON public.chat_mensagens(responsavel_telefone);
CREATE INDEX idx_chat_mensagens_created ON public.chat_mensagens(created_at DESC);
CREATE INDEX idx_chat_mensagens_direcao ON public.chat_mensagens(direcao);
CREATE INDEX idx_chat_mensagens_lida ON public.chat_mensagens(lida_em) WHERE lida_em IS NULL;

-- Habilitar RLS
ALTER TABLE public.chat_mensagens ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admin can manage all chat messages"
ON public.chat_mensagens
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Service role can insert messages"
ON public.chat_mensagens
FOR INSERT
WITH CHECK (true);

-- Habilitar Realtime
ALTER TABLE public.chat_mensagens REPLICA IDENTITY FULL;

-- Trigger para updated_at
CREATE TRIGGER update_chat_mensagens_updated_at
BEFORE UPDATE ON public.chat_mensagens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.chat_mensagens IS 'Mensagens de chat via WhatsApp integrado com Make/Z-API';
COMMENT ON COLUMN public.chat_mensagens.direcao IS 'enviada = admin para responsável, recebida = responsável para admin';