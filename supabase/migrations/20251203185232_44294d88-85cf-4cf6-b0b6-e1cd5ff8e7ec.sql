-- Adicionar novos valores ao enum status_crianca
ALTER TYPE status_crianca ADD VALUE IF NOT EXISTS 'Transferido';
ALTER TYPE status_crianca ADD VALUE IF NOT EXISTS 'Matrícula Trancada';