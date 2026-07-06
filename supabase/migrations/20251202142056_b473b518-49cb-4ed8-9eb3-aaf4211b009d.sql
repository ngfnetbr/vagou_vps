-- Habilitar REPLICA IDENTITY FULL para capturar dados completos
ALTER TABLE public.auditoria REPLICA IDENTITY FULL;

-- Adicionar tabela à publicação realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.auditoria;