-- Script para corrigir problemas de encoding (UTF-8 interpretado como Latin1)
-- Ex: "Ã§" -> "ç", "Ã£" -> "ã"

-- Função segura para tentar corrigir o encoding
CREATE OR REPLACE FUNCTION fix_latin1_encoding(str text) RETURNS text AS $$
BEGIN
  -- Verifica se tem caracteres suspeitos (Ã ou Â são os inícios comuns de sequências multibyte UTF-8 lidas como Latin1)
  IF str !~ '[ÃÂ]' THEN
    RETURN str;
  END IF;

  BEGIN
    -- Tenta converter de volta:
    -- 1. convert_to(str, 'LATIN1') pega os bytes que formam os caracteres "errados"
    -- 2. convert_from(..., 'UTF8') reinterpreta esses bytes como UTF-8 correto
    RETURN convert_from(convert_to(str, 'LATIN1'), 'UTF8');
  EXCEPTION WHEN OTHERS THEN
    -- Se falhar (ex: caractere que não existe em Latin1), mantém o original
    RETURN str;
  END;
END;
$$ LANGUAGE plpgsql;

-- Atualizar tabela de crianças
UPDATE criancas
SET 
  nome = fix_latin1_encoding(nome),
  responsavel_nome = fix_latin1_encoding(responsavel_nome),
  logradouro = fix_latin1_encoding(logradouro),
  bairro = fix_latin1_encoding(bairro),
  cidade = fix_latin1_encoding(cidade),
  complemento = fix_latin1_encoding(complemento),
  observacoes = fix_latin1_encoding(observacoes)
WHERE 
  nome ~ '[ÃÂ]' OR 
  responsavel_nome ~ '[ÃÂ]' OR 
  logradouro ~ '[ÃÂ]' OR 
  bairro ~ '[ÃÂ]' OR
  cidade ~ '[ÃÂ]' OR
  complemento ~ '[ÃÂ]' OR
  observacoes ~ '[ÃÂ]';

-- Atualizar tabela de cmeis (caso algum tenha sobrado)
UPDATE cmeis
SET 
  nome = fix_latin1_encoding(nome),
  endereco = fix_latin1_encoding(endereco),
  bairro = fix_latin1_encoding(bairro)
WHERE 
  nome ~ '[ÃÂ]' OR endereco ~ '[ÃÂ]' OR bairro ~ '[ÃÂ]';

-- Remover função temporária
DROP FUNCTION fix_latin1_encoding(text);

-- Verificar resultados
SELECT count(*) as registros_ainda_com_problema 
FROM criancas 
WHERE nome ~ '[ÃÂ]';
