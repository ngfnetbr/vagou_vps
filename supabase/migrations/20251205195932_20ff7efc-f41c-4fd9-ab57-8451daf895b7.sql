-- Criar trigger para impedir desativação de CMEI com crianças
CREATE OR REPLACE FUNCTION check_cmei_can_deactivate()
RETURNS TRIGGER AS $$
DECLARE
  criancas_count INTEGER;
BEGIN
  -- Se está desativando (ativo mudando de true para false)
  IF OLD.ativo = true AND NEW.ativo = false THEN
    SELECT COUNT(*) INTO criancas_count
    FROM criancas
    WHERE cmei_atual_id = NEW.id;
    
    IF criancas_count > 0 THEN
      RAISE EXCEPTION 'Não é possível desativar CMEI com % criança(s) vinculada(s). Transfira as crianças antes de desativar.', criancas_count;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger na tabela cmeis
DROP TRIGGER IF EXISTS trigger_check_cmei_deactivate ON cmeis;
CREATE TRIGGER trigger_check_cmei_deactivate
  BEFORE UPDATE ON cmeis
  FOR EACH ROW
  EXECUTE FUNCTION check_cmei_can_deactivate();