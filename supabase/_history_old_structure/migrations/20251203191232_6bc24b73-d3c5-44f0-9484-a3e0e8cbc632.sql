-- Adicionar campos de configuração de data de corte e idade
ALTER TABLE configuracoes_sistema 
ADD COLUMN IF NOT EXISTS data_corte_mes integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS data_corte_dia integer DEFAULT 31,
ADD COLUMN IF NOT EXISTS idade_minima_meses integer DEFAULT 6,
ADD COLUMN IF NOT EXISTS idade_maxima_anos integer DEFAULT 3;