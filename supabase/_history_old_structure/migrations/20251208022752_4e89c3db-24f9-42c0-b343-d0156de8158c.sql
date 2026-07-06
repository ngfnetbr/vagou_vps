-- Converter data_penalidade existentes para data_retorno_fila
-- Isso corrige os registros antigos que foram marcados com penalidade

UPDATE criancas
SET 
  data_retorno_fila = data_penalidade,
  data_penalidade = NULL
WHERE data_penalidade IS NOT NULL
  AND status IN ('Fila de Espera', 'Convocado');

-- Recalcular posições da fila
SELECT recalcular_posicoes_fila();