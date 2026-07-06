-- Criar RPC pública para consulta por CPF do responsável
CREATE OR REPLACE FUNCTION public.consulta_publica_por_cpf(p_cpf text)
RETURNS TABLE (
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
SET search_path = public
AS $$
DECLARE
  cpf_limpo text;
BEGIN
  -- Remove caracteres não numéricos do CPF
  cpf_limpo := regexp_replace(p_cpf, '\D', '', 'g');
  
  -- Verifica se o CPF tem 11 dígitos
  IF length(cpf_limpo) != 11 THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    c.id,
    c.nome,
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

-- Permite execução pública da função
GRANT EXECUTE ON FUNCTION public.consulta_publica_por_cpf(text) TO anon;
GRANT EXECUTE ON FUNCTION public.consulta_publica_por_cpf(text) TO authenticated;