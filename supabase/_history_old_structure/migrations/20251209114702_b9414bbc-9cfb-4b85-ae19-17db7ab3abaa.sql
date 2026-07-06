-- Habilitar REPLICA IDENTITY FULL para a tabela chat_mensagens (necessário para realtime updates)
ALTER TABLE public.chat_mensagens REPLICA IDENTITY FULL;

-- Adicionar a tabela à publicação supabase_realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_mensagens;