-- Primeiro, remover a constraint antiga
ALTER TABLE chat_mensagens DROP CONSTRAINT IF EXISTS chat_mensagens_direcao_check;

-- Atualizar dados existentes para o novo formato
UPDATE chat_mensagens SET direcao = 'admin' WHERE direcao = 'enviada';
UPDATE chat_mensagens SET direcao = 'responsavel' WHERE direcao = 'recebida';

-- Adicionar nova constraint com os valores corretos
ALTER TABLE chat_mensagens ADD CONSTRAINT chat_mensagens_direcao_check 
CHECK (direcao IN ('admin', 'responsavel'));