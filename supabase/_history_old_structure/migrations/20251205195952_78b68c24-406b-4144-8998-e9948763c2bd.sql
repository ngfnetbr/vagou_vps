-- Restaurar os nomes dos CMEIs corrompidos
UPDATE cmeis SET nome = 'CMEI Jardim das Flores' WHERE id = '33f6afed-c582-409c-8bf6-db2d9f5974e1';
UPDATE cmeis SET nome = 'CMEI Arco-Íris', ativo = true WHERE id = '48fd47bd-cf75-45d5-9137-c7e221db822a';

-- Corrigir a função com search_path definido
CREATE OR REPLACE FUNCTION check_cmei_can_deactivate()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Adicionar constraint para não permitir nome vazio (agora que os dados estão corretos)
ALTER TABLE cmeis ADD CONSTRAINT cmeis_nome_not_empty CHECK (trim(nome) <> '');