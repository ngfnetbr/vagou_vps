-- Corrigir o search_path da função para segurança
CREATE OR REPLACE FUNCTION registrar_historico_campos_inscricao()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO campos_inscricao_historico (
      campo_id,
      operacao,
      dados_anteriores,
      dados_novos,
      usuario_id
    ) VALUES (
      NULL,
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;