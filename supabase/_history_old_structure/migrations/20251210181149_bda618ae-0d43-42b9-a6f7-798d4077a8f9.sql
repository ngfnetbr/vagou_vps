-- Função para verificar duplicidade de criança (para inscrição pública)
CREATE OR REPLACE FUNCTION public.verificar_duplicidade_inscricao(
  p_nome text,
  p_data_nascimento date,
  p_responsavel_cpf text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cpf_limpo text;
  v_nome_normalizado text;
  v_crianca_duplicada record;
  v_total_por_cpf integer;
BEGIN
  v_cpf_limpo := regexp_replace(p_responsavel_cpf, '[^0-9]', '', 'g');
  v_nome_normalizado := lower(trim(p_nome));
  
  -- Verificar criança com mesmo nome e data de nascimento
  SELECT id, nome, status INTO v_crianca_duplicada
  FROM criancas
  WHERE lower(trim(nome)) = v_nome_normalizado
    AND data_nascimento = p_data_nascimento
  LIMIT 1;
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'duplicada', true,
      'motivo', 'nome_data',
      'nome', v_crianca_duplicada.nome,
      'status', v_crianca_duplicada.status
    );
  END IF;
  
  -- Verificar se responsável já inscreveu criança com mesmo nome
  SELECT id, nome, status INTO v_crianca_duplicada
  FROM criancas
  WHERE responsavel_cpf = v_cpf_limpo
    AND lower(trim(nome)) = v_nome_normalizado
  LIMIT 1;
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'duplicada', true,
      'motivo', 'cpf_nome',
      'nome', v_crianca_duplicada.nome,
      'status', v_crianca_duplicada.status
    );
  END IF;
  
  -- Contar total de inscrições do responsável
  SELECT COUNT(*) INTO v_total_por_cpf
  FROM criancas
  WHERE responsavel_cpf = v_cpf_limpo;
  
  RETURN jsonb_build_object(
    'duplicada', false,
    'total_inscricoes_cpf', v_total_por_cpf
  );
END;
$$;