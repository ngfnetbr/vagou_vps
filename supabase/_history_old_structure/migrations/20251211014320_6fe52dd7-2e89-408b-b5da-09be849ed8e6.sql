-- ============================================
-- SECURITY FIX: Error-level issues
-- ============================================

-- 1. Create CPF validation function with checksum verification
CREATE OR REPLACE FUNCTION public.validar_cpf(cpf text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cpf_limpo text;
  soma integer;
  resto integer;
  dv1 integer;
  dv2 integer;
BEGIN
  cpf_limpo := regexp_replace(cpf, '\D', '', 'g');
  
  -- Basic validations
  IF length(cpf_limpo) != 11 THEN
    RETURN false;
  END IF;
  
  -- All same digits are invalid
  IF cpf_limpo ~ '^(\d)\1{10}$' THEN
    RETURN false;
  END IF;
  
  -- Calculate first check digit
  soma := 0;
  FOR i IN 1..9 LOOP
    soma := soma + substring(cpf_limpo, i, 1)::integer * (11 - i);
  END LOOP;
  resto := soma % 11;
  dv1 := CASE WHEN resto < 2 THEN 0 ELSE 11 - resto END;
  
  IF substring(cpf_limpo, 10, 1)::integer != dv1 THEN
    RETURN false;
  END IF;
  
  -- Calculate second check digit
  soma := 0;
  FOR i IN 1..10 LOOP
    soma := soma + substring(cpf_limpo, i, 1)::integer * (12 - i);
  END LOOP;
  resto := soma % 11;
  dv2 := CASE WHEN resto < 2 THEN 0 ELSE 11 - resto END;
  
  IF substring(cpf_limpo, 11, 1)::integer != dv2 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- 2. Update consulta_publica_por_cpf with stronger rate limiting and CPF validation
CREATE OR REPLACE FUNCTION public.consulta_publica_por_cpf(p_cpf text)
RETURNS TABLE(
  id uuid,
  nome text,
  data_nascimento date,
  status status_crianca,
  posicao_fila integer,
  convocacao_deadline date,
  cmei_atual_nome text,
  turma_atual_nome text,
  cmei1_nome text,
  cmei2_nome text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cpf_limpo text;
  v_rate_limit_count integer;
BEGIN
  -- Clean CPF
  cpf_limpo := regexp_replace(p_cpf, '\D', '', 'g');
  
  -- Validate CPF with checksum
  IF NOT validar_cpf(cpf_limpo) THEN
    RAISE EXCEPTION 'CPF inválido';
  END IF;
  
  -- Rate limiting: max 5 queries per CPF every hour (more restrictive)
  SELECT COUNT(*) INTO v_rate_limit_count
  FROM rate_limit_entries
  WHERE identifier = cpf_limpo
    AND endpoint = 'consulta_cpf'
    AND window_start > now() - interval '1 hour';
  
  IF v_rate_limit_count >= 5 THEN
    RAISE EXCEPTION 'Limite de consultas excedido. Tente novamente em uma hora.';
  END IF;
  
  -- Register this query for rate limiting
  INSERT INTO rate_limit_entries (identifier, endpoint, window_start)
  VALUES (cpf_limpo, 'consulta_cpf', now());
  
  RETURN QUERY
  SELECT 
    c.id,
    -- Return only initials for privacy
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
$$;

-- 3. Update inserir_inscricao_publica to use CPF checksum validation
CREATE OR REPLACE FUNCTION public.inserir_inscricao_publica(
  p_nome text,
  p_data_nascimento date,
  p_sexo text,
  p_responsavel_nome text,
  p_responsavel_cpf text,
  p_responsavel_telefone text,
  p_responsavel_email text DEFAULT NULL,
  p_responsavel_celular text DEFAULT NULL,
  p_cpf_crianca text DEFAULT NULL,
  p_certidao_nascimento text DEFAULT NULL,
  p_cep text DEFAULT NULL,
  p_logradouro text DEFAULT NULL,
  p_numero text DEFAULT NULL,
  p_complemento text DEFAULT NULL,
  p_bairro text DEFAULT NULL,
  p_cidade text DEFAULT NULL,
  p_estado text DEFAULT NULL,
  p_cmei1_preferencia uuid DEFAULT NULL,
  p_cmei2_preferencia uuid DEFAULT NULL,
  p_aceita_qualquer_cmei boolean DEFAULT false,
  p_programas_sociais boolean DEFAULT false,
  p_observacoes text DEFAULT NULL,
  p_responsavel_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_crianca_id uuid;
  v_prioridade prioridade_tipo;
  v_cpf_limpo text;
  v_cpf_crianca_limpo text;
  v_rate_limit_count integer;
  v_limite_inscricoes integer;
  v_inscricoes_existentes integer;
BEGIN
  -- Clean CPF
  v_cpf_limpo := regexp_replace(p_responsavel_cpf, '\D', '', 'g');
  
  -- Validate CPF with checksum (complete validation)
  IF NOT validar_cpf(v_cpf_limpo) THEN
    RAISE EXCEPTION 'CPF do responsável inválido: não passou na verificação de dígitos';
  END IF;
  
  -- Validate child's CPF if provided
  IF p_cpf_crianca IS NOT NULL AND trim(p_cpf_crianca) != '' THEN
    v_cpf_crianca_limpo := regexp_replace(p_cpf_crianca, '\D', '', 'g');
    IF length(v_cpf_crianca_limpo) > 0 AND NOT validar_cpf(v_cpf_crianca_limpo) THEN
      RAISE EXCEPTION 'CPF da criança inválido: não passou na verificação de dígitos';
    END IF;
  END IF;
  
  -- Name validation
  IF length(trim(p_nome)) < 3 THEN
    RAISE EXCEPTION 'Nome da criança deve ter pelo menos 3 caracteres';
  END IF;
  
  IF length(trim(p_responsavel_nome)) < 3 THEN
    RAISE EXCEPTION 'Nome do responsável deve ter pelo menos 3 caracteres';
  END IF;
  
  -- Rate limiting: max 5 inscriptions per CPF every hour
  SELECT COUNT(*) INTO v_rate_limit_count
  FROM rate_limit_entries
  WHERE identifier = v_cpf_limpo
    AND endpoint = 'inscricao_publica'
    AND window_start > now() - interval '1 hour';
  
  IF v_rate_limit_count >= 5 THEN
    RAISE EXCEPTION 'Limite de inscrições excedido. Aguarde antes de tentar novamente.';
  END IF;
  
  -- Register attempt for rate limiting
  INSERT INTO rate_limit_entries (identifier, endpoint, window_start)
  VALUES (v_cpf_limpo, 'inscricao_publica', now());
  
  -- Check limit of inscriptions per responsible
  SELECT COALESCE(limite_inscricoes_responsavel, 5) INTO v_limite_inscricoes
  FROM configuracoes_sistema LIMIT 1;
  
  SELECT COUNT(*) INTO v_inscricoes_existentes
  FROM criancas
  WHERE responsavel_cpf = v_cpf_limpo
    AND status NOT IN ('Desistente', 'Recusada', 'Transferido');
  
  IF v_inscricoes_existentes >= v_limite_inscricoes THEN
    RAISE EXCEPTION 'Limite de inscrições ativas atingido (máximo: %)', v_limite_inscricoes;
  END IF;
  
  -- Determine priority
  v_prioridade := CASE WHEN p_programas_sociais THEN 'Social'::prioridade_tipo ELSE 'Geral'::prioridade_tipo END;
  
  -- Insert child
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
    CASE WHEN p_cpf_crianca IS NOT NULL AND trim(p_cpf_crianca) != '' 
         THEN regexp_replace(p_cpf_crianca, '\D', '', 'g') 
         ELSE NULL END,
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
  
  -- Insert history
  INSERT INTO historico (crianca_id, acao, descricao, status_novo)
  VALUES (v_crianca_id, 'Inscrição Realizada', 'Inscrição realizada através do formulário público', 'Fila de Espera'::status_crianca);
  
  -- Recalculate queue positions
  PERFORM recalcular_posicoes_fila();
  
  RETURN v_crianca_id;
END;
$$;

-- 4. FIX CRITICAL: Remove role column from profiles (prevents privilege escalation)
-- The system uses user_roles table for authorization via has_role() and is_admin()
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- 5. Update RLS policy for profiles to be explicit about allowed fields
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 6. Grant execute on validar_cpf to public (needed for RPC calls)
GRANT EXECUTE ON FUNCTION public.validar_cpf(text) TO anon;
GRANT EXECUTE ON FUNCTION public.validar_cpf(text) TO authenticated;