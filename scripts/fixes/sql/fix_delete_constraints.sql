-- Script para corrigir constraints de chave estrangeira (ON DELETE CASCADE)
-- Execute este script no SQL Editor do Supabase Dashboard se a exclusão de crianças falhar

BEGIN;

-- 1. Historico
ALTER TABLE public.historico DROP CONSTRAINT IF EXISTS historico_crianca_id_fkey;
ALTER TABLE public.historico 
  ADD CONSTRAINT historico_crianca_id_fkey 
  FOREIGN KEY (crianca_id) 
  REFERENCES public.criancas(id) 
  ON DELETE CASCADE;

-- 2. Documentos Criança
ALTER TABLE public.documentos_crianca DROP CONSTRAINT IF EXISTS documentos_crianca_crianca_id_fkey;
ALTER TABLE public.documentos_crianca 
  ADD CONSTRAINT documentos_crianca_crianca_id_fkey 
  FOREIGN KEY (crianca_id) 
  REFERENCES public.criancas(id) 
  ON DELETE CASCADE;

-- 3. Criança Prioridades
ALTER TABLE public.crianca_prioridades DROP CONSTRAINT IF EXISTS crianca_prioridades_crianca_id_fkey;
ALTER TABLE public.crianca_prioridades 
  ADD CONSTRAINT crianca_prioridades_crianca_id_fkey 
  FOREIGN KEY (crianca_id) 
  REFERENCES public.criancas(id) 
  ON DELETE CASCADE;

-- 4. Valores Campos Custom
ALTER TABLE public.valores_campos_custom DROP CONSTRAINT IF EXISTS valores_campos_custom_crianca_id_fkey;
ALTER TABLE public.valores_campos_custom 
  ADD CONSTRAINT valores_campos_custom_crianca_id_fkey 
  FOREIGN KEY (crianca_id) 
  REFERENCES public.criancas(id) 
  ON DELETE CASCADE;

-- 5. Notificações Log
ALTER TABLE public.notificacoes_log DROP CONSTRAINT IF EXISTS notificacoes_log_crianca_id_fkey;
ALTER TABLE public.notificacoes_log 
  ADD CONSTRAINT notificacoes_log_crianca_id_fkey 
  FOREIGN KEY (crianca_id) 
  REFERENCES public.criancas(id) 
  ON DELETE CASCADE;

-- 6. Planejamento Transição
ALTER TABLE public.planejamento_transicao DROP CONSTRAINT IF EXISTS planejamento_transicao_crianca_id_fkey;
ALTER TABLE public.planejamento_transicao 
  ADD CONSTRAINT planejamento_transicao_crianca_id_fkey 
  FOREIGN KEY (crianca_id) 
  REFERENCES public.criancas(id) 
  ON DELETE CASCADE;

-- 7. Chat Mensagens
ALTER TABLE public.chat_mensagens DROP CONSTRAINT IF EXISTS chat_mensagens_crianca_id_fkey;
ALTER TABLE public.chat_mensagens 
  ADD CONSTRAINT chat_mensagens_crianca_id_fkey 
  FOREIGN KEY (crianca_id) 
  REFERENCES public.criancas(id) 
  ON DELETE CASCADE;

COMMIT;
