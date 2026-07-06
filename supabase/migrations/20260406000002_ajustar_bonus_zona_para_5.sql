UPDATE public.configuracoes_sistema
SET prioridade_zona_bonus_dentro = 5
WHERE prioridade_zona_bonus_dentro = 10;

SELECT public.recalcular_posicoes_fila();
