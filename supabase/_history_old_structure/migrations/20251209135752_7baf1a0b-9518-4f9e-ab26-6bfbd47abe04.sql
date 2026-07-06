-- Recriar trigger para recalcular posições da fila automaticamente

-- Dropar trigger antigo se existir
DROP TRIGGER IF EXISTS trigger_atualizar_posicao_fila ON criancas;

-- Recriar trigger
CREATE TRIGGER trigger_atualizar_posicao_fila
AFTER INSERT OR UPDATE OR DELETE ON criancas
FOR EACH ROW
EXECUTE FUNCTION trigger_atualizar_posicao_fila();