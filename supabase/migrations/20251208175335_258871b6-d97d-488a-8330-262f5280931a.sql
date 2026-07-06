-- =============================================
-- MIGRAÇÃO: Converter Chat WhatsApp → Chat Interno
-- =============================================

-- 1. Adicionar coluna responsavel_id na tabela chat_mensagens
ALTER TABLE chat_mensagens 
ADD COLUMN IF NOT EXISTS responsavel_id UUID REFERENCES profiles(id);

-- 2. Remover colunas específicas do WhatsApp (se existirem)
ALTER TABLE chat_mensagens 
DROP COLUMN IF EXISTS webhook_message_id,
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS erro;

-- 3. Alterar coluna responsavel_telefone para opcional (manter por compatibilidade temporária)
ALTER TABLE chat_mensagens 
ALTER COLUMN responsavel_telefone DROP NOT NULL;

-- 4. Adicionar coluna responsavel_id na tabela chat_conversas_config
ALTER TABLE chat_conversas_config 
ADD COLUMN IF NOT EXISTS responsavel_id UUID REFERENCES profiles(id);

ALTER TABLE chat_conversas_config 
ALTER COLUMN responsavel_telefone DROP NOT NULL;

-- 5. Adicionar coluna responsavel_id na tabela chat_conversa_marcadores
ALTER TABLE chat_conversa_marcadores 
ADD COLUMN IF NOT EXISTS responsavel_id UUID REFERENCES profiles(id);

ALTER TABLE chat_conversa_marcadores 
ALTER COLUMN responsavel_telefone DROP NOT NULL;

-- 6. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_responsavel_id ON chat_mensagens(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversas_config_responsavel_id ON chat_conversas_config(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversa_marcadores_responsavel_id ON chat_conversa_marcadores(responsavel_id);

-- 7. Habilitar Realtime para chat_mensagens (se ainda não estiver)
ALTER TABLE chat_mensagens REPLICA IDENTITY FULL;

-- 8. Dropar políticas RLS existentes para recriar
DROP POLICY IF EXISTS "Admin can manage all chat messages" ON chat_mensagens;
DROP POLICY IF EXISTS "Service role can insert messages" ON chat_mensagens;
DROP POLICY IF EXISTS "Admin can manage chat config" ON chat_conversas_config;
DROP POLICY IF EXISTS "Admin can manage conversation labels" ON chat_conversa_marcadores;

-- 9. Criar novas políticas RLS para chat_mensagens

-- Admin pode gerenciar todas as mensagens
CREATE POLICY "Admin can manage all chat messages" 
ON chat_mensagens FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Responsável pode ver suas próprias mensagens
CREATE POLICY "Responsavel can view own messages" 
ON chat_mensagens FOR SELECT 
USING (responsavel_id = auth.uid());

-- Responsável pode enviar mensagens
CREATE POLICY "Responsavel can insert own messages" 
ON chat_mensagens FOR INSERT 
WITH CHECK (responsavel_id = auth.uid() AND direcao = 'responsavel');

-- 10. Criar novas políticas RLS para chat_conversas_config

-- Admin pode gerenciar todas as configurações
CREATE POLICY "Admin can manage chat config" 
ON chat_conversas_config FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Responsável pode ver sua própria configuração
CREATE POLICY "Responsavel can view own chat config" 
ON chat_conversas_config FOR SELECT 
USING (responsavel_id = auth.uid());

-- Responsável pode criar sua própria configuração
CREATE POLICY "Responsavel can insert own chat config" 
ON chat_conversas_config FOR INSERT 
WITH CHECK (responsavel_id = auth.uid());

-- 11. Criar novas políticas RLS para chat_conversa_marcadores

-- Admin pode gerenciar todos os marcadores
CREATE POLICY "Admin can manage conversation labels" 
ON chat_conversa_marcadores FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Responsável pode ver marcadores de suas conversas
CREATE POLICY "Responsavel can view own conversation labels" 
ON chat_conversa_marcadores FOR SELECT 
USING (responsavel_id = auth.uid());