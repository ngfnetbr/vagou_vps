-- =============================================
-- CORREÇÕES DE SEGURANÇA - FASE 1
-- =============================================

-- 1. Adicionar rate limiting à função consulta_publica_por_cpf
CREATE OR REPLACE FUNCTION public.consulta_publica_por_cpf(p_cpf text)
 RETURNS TABLE(id uuid, nome text, data_nascimento date, status status_crianca, posicao_fila integer, convocacao_deadline date, cmei_atual_nome text, turma_atual_nome text, cmei1_nome text, cmei2_nome text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cpf_limpo text;
  v_rate_limit_count integer;
  v_window_start timestamp with time zone;
BEGIN
  -- Remove caracteres não numéricos do CPF
  cpf_limpo := regexp_replace(p_cpf, '\D', '', 'g');
  
  -- Verifica se o CPF tem 11 dígitos
  IF length(cpf_limpo) != 11 THEN
    RETURN;
  END IF;
  
  -- Validação básica de CPF (dígitos repetidos são inválidos)
  IF cpf_limpo ~ '^(\d)\1{10}$' THEN
    RETURN;
  END IF;
  
  -- Rate limiting: máximo 10 consultas por CPF a cada 10 minutos
  SELECT COUNT(*), MIN(window_start) INTO v_rate_limit_count, v_window_start
  FROM rate_limit_entries
  WHERE identifier = cpf_limpo
    AND endpoint = 'consulta_cpf'
    AND window_start > now() - interval '10 minutes';
  
  IF v_rate_limit_count >= 10 THEN
    RAISE EXCEPTION 'Limite de consultas excedido. Tente novamente em alguns minutos.';
  END IF;
  
  -- Registrar esta consulta para rate limiting
  INSERT INTO rate_limit_entries (identifier, endpoint, window_start)
  VALUES (cpf_limpo, 'consulta_cpf', now());
  
  RETURN QUERY
  SELECT 
    c.id,
    -- Retornar apenas iniciais do nome para privacidade
    (SELECT string_agg(substr(word, 1, 1) || '.', '')
     FROM unnest(string_to_array(c.nome, ' ')) AS word
     WHERE word <> '') AS nome,
    c.data_nascimento,
    c.status,
    c.posicao_fila,
    c.convocacao_deadline,
    cmei_atual.nome AS cmei_atual_nome,
    turma_atual.nome AS turma_atual_nome,
    cmei1.nome AS cmei1_nome,
    cmei2.nome AS cmei2_nome
  FROM criancas c
  LEFT JOIN cmeis cmei_atual ON c.cmei_atual_id = cmei_atual.id
  LEFT JOIN turmas turma_atual ON c.turma_atual_id = turma_atual.id
  LEFT JOIN cmeis cmei1 ON c.cmei1_preferencia = cmei1.id
  LEFT JOIN cmeis cmei2 ON c.cmei2_preferencia = cmei2.id
  WHERE c.responsavel_cpf = cpf_limpo;
END;
$function$;

-- 2. Adicionar validações à função inserir_inscricao_publica
CREATE OR REPLACE FUNCTION public.inserir_inscricao_publica(
  p_nome text, 
  p_data_nascimento date, 
  p_sexo text, 
  p_responsavel_nome text, 
  p_responsavel_cpf text, 
  p_responsavel_telefone text, 
  p_responsavel_email text DEFAULT NULL::text, 
  p_responsavel_celular text DEFAULT NULL::text, 
  p_cpf_crianca text DEFAULT NULL::text, 
  p_certidao_nascimento text DEFAULT NULL::text, 
  p_cep text DEFAULT NULL::text, 
  p_logradouro text DEFAULT NULL::text, 
  p_numero text DEFAULT NULL::text, 
  p_complemento text DEFAULT NULL::text, 
  p_bairro text DEFAULT NULL::text, 
  p_cidade text DEFAULT NULL::text, 
  p_estado text DEFAULT NULL::text, 
  p_cmei1_preferencia uuid DEFAULT NULL::uuid, 
  p_cmei2_preferencia uuid DEFAULT NULL::uuid, 
  p_aceita_qualquer_cmei boolean DEFAULT false, 
  p_programas_sociais boolean DEFAULT false, 
  p_observacoes text DEFAULT NULL::text, 
  p_responsavel_user_id uuid DEFAULT NULL::uuid
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_crianca_id uuid;
  v_prioridade prioridade_tipo;
  v_cpf_limpo text;
  v_rate_limit_count integer;
  v_limite_inscricoes integer;
  v_inscricoes_existentes integer;
BEGIN
  -- Limpa o CPF
  v_cpf_limpo := regexp_replace(p_responsavel_cpf, '\D', '', 'g');
  
  -- Validação: CPF deve ter 11 dígitos
  IF length(v_cpf_limpo) != 11 THEN
    RAISE EXCEPTION 'CPF inválido: deve conter 11 dígitos';
  END IF;
  
  -- Validação: CPF não pode ser dígitos repetidos
  IF v_cpf_limpo ~ '^(\d)\1{10}$' THEN
    RAISE EXCEPTION 'CPF inválido: dígitos repetidos não são permitidos';
  END IF;
  
  -- Validação: Nome deve ter pelo menos 3 caracteres
  IF length(trim(p_nome)) < 3 THEN
    RAISE EXCEPTION 'Nome da criança deve ter pelo menos 3 caracteres';
  END IF;
  
  -- Validação: Nome do responsável deve ter pelo menos 3 caracteres
  IF length(trim(p_responsavel_nome)) < 3 THEN
    RAISE EXCEPTION 'Nome do responsável deve ter pelo menos 3 caracteres';
  END IF;
  
  -- Rate limiting: máximo 5 inscrições por CPF a cada hora
  SELECT COUNT(*) INTO v_rate_limit_count
  FROM rate_limit_entries
  WHERE identifier = v_cpf_limpo
    AND endpoint = 'inscricao_publica'
    AND window_start > now() - interval '1 hour';
  
  IF v_rate_limit_count >= 5 THEN
    RAISE EXCEPTION 'Limite de inscrições excedido. Aguarde antes de tentar novamente.';
  END IF;
  
  -- Registrar tentativa para rate limiting
  INSERT INTO rate_limit_entries (identifier, endpoint, window_start)
  VALUES (v_cpf_limpo, 'inscricao_publica', now());
  
  -- Verificar limite de inscrições por responsável
  SELECT COALESCE(limite_inscricoes_responsavel, 5) INTO v_limite_inscricoes
  FROM configuracoes_sistema LIMIT 1;
  
  SELECT COUNT(*) INTO v_inscricoes_existentes
  FROM criancas
  WHERE responsavel_cpf = v_cpf_limpo
    AND status NOT IN ('Desistente', 'Recusada', 'Transferido');
  
  IF v_inscricoes_existentes >= v_limite_inscricoes THEN
    RAISE EXCEPTION 'Limite de inscrições ativas atingido (máximo: %)', v_limite_inscricoes;
  END IF;
  
  -- Determinar prioridade
  v_prioridade := CASE WHEN p_programas_sociais THEN 'Social'::prioridade_tipo ELSE 'Geral'::prioridade_tipo END;
  
  -- Inserir criança
  INSERT INTO criancas (
    nome,
    data_nascimento,
    sexo,
    responsavel_nome,
    responsavel_cpf,
    responsavel_telefone,
    responsavel_email,
    responsavel_celular,
    cpf_crianca,
    certidao_nascimento,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    cmei1_preferencia,
    cmei2_preferencia,
    aceita_qualquer_cmei,
    programas_sociais,
    observacoes,
    responsavel_user_id,
    status,
    prioridade
  ) VALUES (
    trim(p_nome),
    p_data_nascimento,
    p_sexo::sexo_tipo,
    trim(p_responsavel_nome),
    v_cpf_limpo,
    p_responsavel_telefone,
    lower(trim(p_responsavel_email)),
    p_responsavel_celular,
    regexp_replace(COALESCE(p_cpf_crianca, ''), '\D', '', 'g'),
    p_certidao_nascimento,
    p_cep,
    p_logradouro,
    p_numero,
    p_complemento,
    p_bairro,
    p_cidade,
    p_estado,
    p_cmei1_preferencia,
    p_cmei2_preferencia,
    p_aceita_qualquer_cmei,
    p_programas_sociais,
    p_observacoes,
    p_responsavel_user_id,
    'Fila de Espera'::status_crianca,
    v_prioridade
  )
  RETURNING id INTO v_crianca_id;
  
  -- Inserir no histórico
  INSERT INTO historico (crianca_id, acao, descricao, status_novo)
  VALUES (v_crianca_id, 'Inscrição Realizada', 'Inscrição realizada através do formulário público', 'Fila de Espera'::status_crianca);
  
  -- Recalcular posições da fila
  PERFORM recalcular_posicoes_fila();
  
  RETURN v_crianca_id;
END;
$function$;

-- 3. Restringir buckets de storage
UPDATE storage.buckets 
SET file_size_limit = 2097152, -- 2MB
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
WHERE id = 'avatars';

UPDATE storage.buckets 
SET file_size_limit = 10485760, -- 10MB
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/gif']
WHERE id = 'assets';

UPDATE storage.buckets 
SET file_size_limit = 5242880, -- 5MB
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
WHERE id = 'brasoes';

-- 4. Criar índice para melhorar performance do rate limiting
CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup 
ON rate_limit_entries (identifier, endpoint, window_start);

-- 5. Limpar entradas antigas de rate limit automaticamente (função já existe, criar job)
-- Nota: A limpeza será feita via cron job no Supabase ou chamada periódica