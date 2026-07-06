
-- Função para corrigir encoding (UTF-8 interpretado como Latin-1)
CREATE OR REPLACE FUNCTION fix_mojibake(str text) RETURNS text AS $$
BEGIN
  -- Se for nulo ou não contiver caracteres suspeitos (Ã ou Â), retorna original
  IF str IS NULL OR str !~ '[ÃÂ]' THEN
    RETURN str;
  END IF;

  BEGIN
    -- Tenta converter de volta
    -- 1. Converte a string (que está "errada" em UTF-8 mas visualmente parece bytes Latin-1) para binário usando Latin-1
    -- 2. Lê esses bytes binários como UTF-8 correto
    RETURN convert_from(convert_to(str, 'LATIN1'), 'UTF8');
  EXCEPTION WHEN OTHERS THEN
    -- Se falhar (ex: não for válido UTF-8), retorna original
    RETURN str;
  END;
END;
$$ LANGUAGE plpgsql;

-- 1. Corrigir Tutorial Seções (incluindo JSON)
UPDATE tutorial_secoes 
SET 
  titulo = fix_mojibake(titulo),
  descricao = fix_mojibake(descricao),
  -- Para JSON, convertemos para texto, corrigimos e voltamos para JSON
  -- Isso funciona porque a estrutura do JSON ({}, [], ":") é ASCII e não é afetada
  conteudo = fix_mojibake(conteudo::text)::jsonb;

-- 2. Corrigir Tutorial FAQ
UPDATE tutorial_faq
SET 
  pergunta = fix_mojibake(pergunta),
  resposta = fix_mojibake(resposta),
  categoria = fix_mojibake(categoria);

-- 3. Corrigir Tutoriais Vídeos
UPDATE tutoriais_videos
SET 
  titulo = fix_mojibake(titulo),
  descricao = fix_mojibake(descricao);

-- 4. Corrigir Tutorial Dicas
UPDATE tutorial_dicas
SET 
  titulo = fix_mojibake(titulo),
  descricao = fix_mojibake(descricao);

-- 5. Corrigir Configurações do Sistema
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

-- Opcional: Mostrar resultado (apenas se rodar no editor SQL que suporta retorno)
SELECT 'Correção concluída com sucesso' as status;
