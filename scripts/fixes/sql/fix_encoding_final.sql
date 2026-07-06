
-- 1. Remove funções antigas para garantir atualização da lógica
DROP FUNCTION IF EXISTS fix_mojibake(text);
DROP FUNCTION IF EXISTS fix_tutorial_json_content(jsonb);

-- 2. Cria função de correção usando WIN1252 (importante para caracteres como "É")
CREATE OR REPLACE FUNCTION fix_mojibake(str text) RETURNS text AS $$
BEGIN
  -- Se for nulo ou não contiver caracteres suspeitos (Ã ou Â), retorna original
  IF str IS NULL OR str !~ '[ÃÂ]' THEN
    RETURN str;
  END IF;

  BEGIN
    -- Tenta converter usando WIN1252 (Windows-1252 covers ranges that Latin1 doesn't, like 0x80-0x9F)
    RETURN convert_from(convert_to(str, 'WIN1252'), 'UTF8');
  EXCEPTION WHEN OTHERS THEN
    -- Se falhar com WIN1252, tenta LATIN1 como fallback
    BEGIN
      RETURN convert_from(convert_to(str, 'LATIN1'), 'UTF8');
    EXCEPTION WHEN OTHERS THEN
      RETURN str;
    END;
  END;
END;
$$ LANGUAGE plpgsql;

-- 3. Função para corrigir JSON de conteúdo (Tutorial Seções)
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
    -- Extrai e corrige
    fixed_subtitle := fix_mojibake(item->>'subtitle');
    fixed_text := fix_mojibake(item->>'text');
    
    -- Reconstrói
    new_content := new_content || jsonb_build_object(
      'subtitle', fixed_subtitle,
      'text', fixed_text
    );
  END LOOP;

  RETURN new_content;
END;
$$ LANGUAGE plpgsql;

-- 4. Executa as atualizações em todas as tabelas afetadas

-- Tutorial Seções (Título, Descrição e Conteúdo JSON)
UPDATE tutorial_secoes 
SET 
  titulo = fix_mojibake(titulo),
  descricao = fix_mojibake(descricao),
  conteudo = fix_tutorial_json_content(conteudo);

-- Tutorial FAQ
UPDATE tutorial_faq
SET 
  pergunta = fix_mojibake(pergunta),
  resposta = fix_mojibake(resposta),
  categoria = fix_mojibake(categoria);

-- Tutoriais Vídeos
UPDATE tutoriais_videos
SET 
  titulo = fix_mojibake(titulo),
  descricao = fix_mojibake(descricao);

-- Tutorial Dicas
UPDATE tutorial_dicas
SET 
  titulo = fix_mojibake(titulo),
  descricao = fix_mojibake(descricao);

-- Configurações do Sistema
UPDATE configuracoes_sistema
SET
  nome_municipio = fix_mojibake(nome_municipio),
  nome_secretaria = fix_mojibake(nome_secretaria),
  sistema_nome = fix_mojibake(sistema_nome),
  mensagem_idade_fora_faixa = fix_mojibake(mensagem_idade_fora_faixa),
  demo_mensagem = fix_mojibake(demo_mensagem),
  mensagem_manutencao = fix_mojibake(mensagem_manutencao),
  motivo_bloqueio_inscricoes = fix_mojibake(motivo_bloqueio_inscricoes),
  mensagem_fora_horario = fix_mojibake(mensagem_fora_horario),
  suporte_dev_nome = fix_mojibake(suporte_dev_nome),
  endereco_secretaria = fix_mojibake(endereco_secretaria),
  email_contato = fix_mojibake(email_contato),
  telefone_contato = fix_mojibake(telefone_contato),
  suporte_email = fix_mojibake(suporte_email),
  suporte_telefone = fix_mojibake(suporte_telefone),
  suporte_dev_email = fix_mojibake(suporte_dev_email),
  suporte_dev_telefone = fix_mojibake(suporte_dev_telefone);

-- 5. Confirmação
SELECT 'Correção Final (WIN1252) aplicada com sucesso' as status;
