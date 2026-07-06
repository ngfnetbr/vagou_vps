-- Remover trigger antigo que pode estar causando conflito
DROP TRIGGER IF EXISTS log_campos_inscricao ON campos_inscricao;
DROP TRIGGER IF EXISTS campos_inscricao_audit_trigger ON campos_inscricao;

-- Remover função antiga problemática
DROP FUNCTION IF EXISTS log_campos_inscricao_changes() CASCADE;

-- Garantir que só existe nosso trigger correto
DROP TRIGGER IF EXISTS trigger_campos_inscricao_historico ON campos_inscricao;

CREATE TRIGGER trigger_campos_inscricao_historico
AFTER INSERT OR UPDATE OR DELETE ON campos_inscricao
FOR EACH ROW EXECUTE FUNCTION registrar_historico_campos_inscricao();