-- Função para verificar se uma turma pode ser inativada
CREATE OR REPLACE FUNCTION check_turma_can_deactivate()
RETURNS TRIGGER AS $$
BEGIN
  -- Se está tentando inativar (OLD.ativo = true e NEW.ativo = false)
  IF OLD.ativo = true AND NEW.ativo = false THEN
    -- Verificar se há crianças com status ativo vinculadas
    IF EXISTS (
      SELECT 1 FROM criancas 
      WHERE turma_atual_id = OLD.id 
      AND status IN ('Matriculado', 'Matriculada', 'Convocado', 'Aguardando Documentação')
    ) THEN
      RAISE EXCEPTION 'Não é possível inativar esta turma porque existem crianças convocadas ou matriculadas vinculadas.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para verificar antes de atualizar uma turma
DROP TRIGGER IF EXISTS trigger_check_turma_deactivate ON turmas;

CREATE TRIGGER trigger_check_turma_deactivate
  BEFORE UPDATE ON turmas
  FOR EACH ROW
  EXECUTE FUNCTION check_turma_can_deactivate();