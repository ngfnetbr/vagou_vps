-- Habilitar Realtime nas tabelas principais
-- Configurar REPLICA IDENTITY FULL para capturar dados completos
ALTER TABLE public.criancas REPLICA IDENTITY FULL;
ALTER TABLE public.historico REPLICA IDENTITY FULL;
ALTER TABLE public.notificacoes_log REPLICA IDENTITY FULL;

-- Adicionar tabelas à publicação do Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.criancas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.historico;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes_log;