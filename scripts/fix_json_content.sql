
-- 1. Garante que a função base de correção existe
CREATE OR REPLACE FUNCTION fix_mojibake(str text) RETURNS text AS $$
BEGIN
  -- Se for nulo ou não contiver caracteres suspeitos (Ã ou Â), retorna original
  IF str IS NULL OR str !~ '[ÃÂ]' THEN
    RETURN str;
  END IF;
  BEGIN
    -- Converte Latin1 -> UTF8 para corrigir Mojibake
    RETURN convert_from(convert_to(str, 'LATIN1'), 'UTF8');
  EXCEPTION WHEN OTHERS THEN
    RETURN str;
  END;
END;
$$ LANGUAGE plpgsql;

-- 2. Função específica para iterar e corrigir o array JSON de conteúdo
CREATE OR REPLACE FUNCTION fix_tutorial_json_content(content jsonb) RETURNS jsonb AS $$
DECLARE
  item jsonb;
  new_content jsonb := '[]'::jsonb;
  fixed_subtitle text;
  fixed_text text;
BEGIN
  -- Se não for array, retorna como está
  IF content IS NULL OR jsonb_typeof(content) != 'array' THEN
    RETURN content;
  END IF;

  -- Itera sobre cada item do array
  FOR item IN SELECT * FROM jsonb_array_elements(content)
  LOOP
    -- Extrai os valores como texto e aplica a correção
    fixed_subtitle := fix_mojibake(item->>'subtitle');
    fixed_text := fix_mojibake(item->>'text');
    
    -- Reconstrói o objeto com os valores corrigidos
    new_content := new_content || jsonb_build_object(
      'subtitle', fixed_subtitle,
      'text', fixed_text
    );
  END LOOP;

  RETURN new_content;
END;
$$ LANGUAGE plpgsql;

-- 3. Aplica a correção na coluna conteudo da tabela tutorial_secoes
UPDATE tutorial_secoes 
SET conteudo = fix_tutorial_json_content(conteudo)
WHERE conteudo IS NOT NULL;

-- 4. Confirmação
SELECT 'Conteúdos JSON corrigidos com sucesso' as status;
