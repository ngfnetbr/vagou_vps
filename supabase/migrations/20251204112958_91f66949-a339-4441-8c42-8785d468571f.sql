-- Função para vincular crianças ao responsável pelo CPF
CREATE OR REPLACE FUNCTION public.link_children_by_cpf(_user_id uuid, _cpf text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cpf_limpo text;
  rows_updated integer;
BEGIN
  -- Remove caracteres não numéricos do CPF
  cpf_limpo := regexp_replace(_cpf, '[^0-9]', '', 'g');
  
  -- Atualiza crianças que têm o mesmo CPF do responsável mas não estão vinculadas
  UPDATE criancas
  SET responsavel_user_id = _user_id
  WHERE responsavel_cpf = cpf_limpo
    AND responsavel_user_id IS NULL;
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated;
END;
$$;

-- Concede permissão para usuários autenticados executarem a função
GRANT EXECUTE ON FUNCTION public.link_children_by_cpf(uuid, text) TO authenticated;