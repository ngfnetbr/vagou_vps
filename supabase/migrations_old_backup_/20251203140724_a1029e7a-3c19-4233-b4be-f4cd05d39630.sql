-- Adicionar coluna para resposta a mensagem específica
ALTER TABLE public.chat_mensagens
ADD COLUMN reply_to_id uuid REFERENCES public.chat_mensagens(id) ON DELETE SET NULL;

-- Criar índice para melhor performance
CREATE INDEX idx_chat_mensagens_reply_to ON public.chat_mensagens(reply_to_id);