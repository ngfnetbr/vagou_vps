-- Adicionar novo status "Aguardando Assinatura" ao enum status_crianca
ALTER TYPE status_crianca ADD VALUE IF NOT EXISTS 'Aguardando Assinatura';

-- Adicionar campo prazo_assinatura_dias na configuração do sistema
ALTER TABLE configuracoes_sistema 
ADD COLUMN IF NOT EXISTS prazo_assinatura_dias integer DEFAULT 7;