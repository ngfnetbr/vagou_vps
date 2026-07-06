-- Desabilitar o trigger de recálculo automático da fila
-- A ordenação já é feita no frontend, não precisa recalcular posições no banco a cada update
DROP TRIGGER IF EXISTS tr_atualizar_posicao_fila ON criancas;