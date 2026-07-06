-- Script para corrigir problemas de encoding nas tabelas de tutorial

CREATE OR REPLACE FUNCTION fix_latin1_encoding(str text) RETURNS text AS $$
BEGIN
  IF str IS NULL OR str !~ '[ÃÂ]' THEN
    RETURN str;
  END IF;

  BEGIN
    RETURN convert_from(convert_to(str, 'LATIN1'), 'UTF8');
  EXCEPTION WHEN OTHERS THEN
    RETURN str;
  END;
END;
$$ LANGUAGE plpgsql;

-- Tutoriais Vídeos
UPDATE tutoriais_videos
SET 
  titulo = fix_latin1_encoding(titulo),
  descricao = fix_latin1_encoding(descricao)
WHERE 
  titulo ~ '[ÃÂ]' OR 
  descricao ~ '[ÃÂ]';

-- Tutorial FAQ
UPDATE tutorial_faq
SET 
  categoria = fix_latin1_encoding(categoria),
  pergunta = fix_latin1_encoding(pergunta),
  resposta = fix_latin1_encoding(resposta)
WHERE 
  categoria ~ '[ÃÂ]' OR 
  pergunta ~ '[ÃÂ]' OR 
  resposta ~ '[ÃÂ]';

-- Tutorial Dicas
UPDATE tutorial_dicas
SET 
  titulo = fix_latin1_encoding(titulo),
  descricao = fix_latin1_encoding(descricao)
WHERE 
  titulo ~ '[ÃÂ]' OR 
  descricao ~ '[ÃÂ]';

-- Tutorial Seções (Campos simples)
UPDATE tutorial_secoes
SET 
  titulo = fix_latin1_encoding(titulo),
  descricao = fix_latin1_encoding(descricao)
WHERE 
  titulo ~ '[ÃÂ]' OR 
  descricao ~ '[ÃÂ]';

-- Tutorial Seções (Conteúdo JSONB)
-- Reconstrói o array de objetos aplicando a correção nos campos de texto
UPDATE tutorial_secoes
SET conteudo = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'subtitle', fix_latin1_encoding(elem->>'subtitle'),
      'text', fix_latin1_encoding(elem->>'text')
    )
  )
  FROM jsonb_array_elements(conteudo) AS elem
)
WHERE 
  conteudo::text ~ '[ÃÂ]';

-- Limpeza
DROP FUNCTION fix_latin1_encoding(text);
