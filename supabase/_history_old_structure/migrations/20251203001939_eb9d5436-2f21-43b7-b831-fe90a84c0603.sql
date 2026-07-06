-- Add address fields to configuracoes_sistema for the secretary location
ALTER TABLE public.configuracoes_sistema
ADD COLUMN IF NOT EXISTS endereco_secretaria text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS endereco_latitude decimal(10, 8) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS endereco_longitude decimal(11, 8) DEFAULT NULL;