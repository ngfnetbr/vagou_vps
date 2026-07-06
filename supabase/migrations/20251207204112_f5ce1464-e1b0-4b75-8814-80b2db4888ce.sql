-- Configurar REPLICA IDENTITY FULL para atualizações em tempo real
ALTER TABLE public.auditoria REPLICA IDENTITY FULL;