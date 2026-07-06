-- Criar tabela para configurações de conversas (arquivamento, fixação)
CREATE TABLE public.chat_conversas_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  responsavel_telefone text NOT NULL UNIQUE,
  arquivada boolean DEFAULT false,
  fixada boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_conversas_config ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admin can manage chat config"
ON public.chat_conversas_config
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_chat_conversas_config_updated_at
  BEFORE UPDATE ON public.chat_conversas_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();