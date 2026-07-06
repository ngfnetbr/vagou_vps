-- Função para corrigir encoding (se não existir)
CREATE OR REPLACE FUNCTION fix_latin1_encoding(str text) RETURNS text AS $$
BEGIN
  -- Se não contém caracteres suspeitos de encoding errado (Ã, Â seguidos de outros caracteres comuns em UTF-8 interpretado como Latin1)
  -- O padrão '[ÃÂ]' captura o início comum de sequências UTF-8 lidas como Latin1
  IF str !~ '[ÃÂ]' THEN
    RETURN str;
  END IF;

  BEGIN
    -- Tenta converter de Latin1 para UTF8
    RETURN convert_from(convert_to(str, 'LATIN1'), 'UTF8');
  EXCEPTION WHEN OTHERS THEN
    -- Se falhar, retorna original
    RETURN str;
  END;
END;
$$ LANGUAGE plpgsql;

-- Update templates_mensagens
UPDATE templates_mensagens
SET 
  titulo = fix_latin1_encoding(titulo),
  descricao = fix_latin1_encoding(descricao),
  assunto_email = fix_latin1_encoding(assunto_email),
  corpo_email = fix_latin1_encoding(corpo_email),
  corpo_sms = fix_latin1_encoding(corpo_sms),
  corpo_whatsapp = fix_latin1_encoding(corpo_whatsapp)
WHERE 
  titulo ~ '[ÃÂ]' OR 
  descricao ~ '[ÃÂ]' OR 
  assunto_email ~ '[ÃÂ]' OR 
  corpo_email ~ '[ÃÂ]' OR
  corpo_sms ~ '[ÃÂ]' OR
  corpo_whatsapp ~ '[ÃÂ]';

-- Update turmas_base
UPDATE turmas_base
SET 
  nome = fix_latin1_encoding(nome),
  descricao = fix_latin1_encoding(descricao)
WHERE 
  nome ~ '[ÃÂ]' OR 
  descricao ~ '[ÃÂ]';

-- Update configuracoes_sistema
UPDATE configuracoes_sistema
SET
  nome_municipio = fix_latin1_encoding(nome_municipio),
  nome_secretaria = fix_latin1_encoding(nome_secretaria),
  mensagem_manutencao = fix_latin1_encoding(mensagem_manutencao),
  motivo_bloqueio_inscricoes = fix_latin1_encoding(motivo_bloqueio_inscricoes),
  demo_mensagem = fix_latin1_encoding(demo_mensagem),
  sistema_nome = fix_latin1_encoding(sistema_nome),
  app_nome = fix_latin1_encoding(app_nome)
WHERE
  nome_municipio ~ '[ÃÂ]' OR
  nome_secretaria ~ '[ÃÂ]' OR
  mensagem_manutencao ~ '[ÃÂ]' OR
  motivo_bloqueio_inscricoes ~ '[ÃÂ]' OR
  demo_mensagem ~ '[ÃÂ]' OR
  sistema_nome ~ '[ÃÂ]' OR
  app_nome ~ '[ÃÂ]';
