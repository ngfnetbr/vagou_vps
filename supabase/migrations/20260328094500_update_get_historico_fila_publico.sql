CREATE OR REPLACE FUNCTION public.get_historico_fila_publico()
RETURNS TABLE (
  id uuid,
  acao text,
  created_at timestamp with time zone,
  crianca_nome text,
  crianca_status text,
  crianca_data_nascimento date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    h.id,
    h.acao,
    h.created_at,
    (SELECT string_agg(substr(word, 1, 1) || '.', '')
     FROM unnest(string_to_array(c.nome, ' ')) AS word
     WHERE word <> '') as crianca_nome,
    c.status::text as crianca_status,
    c.data_nascimento as crianca_data_nascimento
  FROM historico h
  LEFT JOIN criancas c ON h.crianca_id = c.id
  WHERE h.acao IN ('Desistência', 'Recusada', 'Fim de Fila', 'Prazo Expirado', 'Matrícula Confirmada', 'Remanejamento Concluído')
    AND (
      h.acao = 'Matrícula Confirmada' 
      OR c.status IS NULL 
      OR c.status != 'Fila de Espera'
    )
  ORDER BY h.created_at DESC
  LIMIT 100
$$;
