ALTER TABLE public.criancas
ADD COLUMN IF NOT EXISTS posicao_fila_cmei2 integer NULL;

SELECT public.recalcular_posicoes_fila();
