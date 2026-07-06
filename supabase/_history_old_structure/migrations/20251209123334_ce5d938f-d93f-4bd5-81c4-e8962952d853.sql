-- Primeiro, vamos dropar o trigger existente se houver
DROP TRIGGER IF EXISTS trigger_campos_inscricao_historico ON campos_inscricao;
DROP FUNCTION IF EXISTS registrar_historico_campos_inscricao() CASCADE;

-- Criar uma função que registra o histórico sem o campo_id para deletes
CREATE OR REPLACE FUNCTION registrar_historico_campos_inscricao()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Para DELETE, registra sem campo_id (será NULL devido ao ON DELETE SET NULL)
    INSERT INTO campos_inscricao_historico (
      campo_id,
      operacao,
      dados_anteriores,
      dados_novos,
      usuario_id
    ) VALUES (
      NULL, -- campo_id será NULL pois o registro está sendo excluído
      'DELETE',
      row_to_json(OLD),
      NULL,
      auth.uid()
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO campos_inscricao_historico (
      campo_id,
      operacao,
      dados_anteriores,
      dados_novos,
      usuario_id
    ) VALUES (
      NEW.id,
      'UPDATE',
      row_to_json(OLD),
      row_to_json(NEW),
      auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO campos_inscricao_historico (
      campo_id,
      operacao,
      dados_anteriores,
      dados_novos,
      usuario_id
    ) VALUES (
      NEW.id,
      'INSERT',
      NULL,
      row_to_json(NEW),
      auth.uid()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar o trigger
CREATE TRIGGER trigger_campos_inscricao_historico
AFTER INSERT OR UPDATE OR DELETE ON campos_inscricao
FOR EACH ROW EXECUTE FUNCTION registrar_historico_campos_inscricao();