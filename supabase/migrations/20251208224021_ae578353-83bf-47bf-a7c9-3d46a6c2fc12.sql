
-- Atualizar função get_fila_publica para abreviar todos os nomes e ordenar convocados/remanejamento primeiro
DROP FUNCTION IF EXISTS public.get_fila_publica();

CREATE OR REPLACE FUNCTION public.get_fila_publica()
RETURNS TABLE(
  id uuid,
  nome text,
  data_nascimento date,
  sexo text,
  status text,
  posicao_fila integer,
  prioridade text,
  programas_sociais boolean,
  created_at timestamp with time zone,
  cmei1_nome text,
  cmei2_nome text,
  responsavel_nome text,
  convocacao_deadline date,
  cmei_remanejamento_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    c.id,
    -- Nome da criança: todas iniciais (A.B.C.)
    (SELECT string_agg(substr(word, 1, 1) || '.', '')
     FROM unnest(string_to_array(c.nome, ' ')) AS word
     WHERE word <> '') as nome,
    c.data_nascimento,
    c.sexo::text,
    c.status::text,
    c.posicao_fila,
    c.prioridade::text,
    c.programas_sociais,
    c.created_at,
    cmei1.nome as cmei1_nome,
    cmei2.nome as cmei2_nome,
    -- Nome do responsável: todas iniciais (A.B.C.)
    (SELECT string_agg(substr(word, 1, 1) || '.', '')
     FROM unnest(string_to_array(c.responsavel_nome, ' ')) AS word
     WHERE word <> '') as responsavel_nome,
    c.convocacao_deadline,
    c.cmei_remanejamento_id
  FROM criancas c
  LEFT JOIN cmeis cmei1 ON c.cmei1_preferencia = cmei1.id
  LEFT JOIN cmeis cmei2 ON c.cmei2_preferencia = cmei2.id
  WHERE c.status IN ('Fila de Espera', 'Convocado')
  ORDER BY 
    -- Convocados primeiro
    CASE WHEN c.status = 'Convocado' THEN 0 ELSE 1 END ASC,
    -- Remanejamento segundo
    CASE WHEN c.cmei_remanejamento_id IS NOT NULL THEN 0 ELSE 1 END ASC,
    -- Depois pela posição na fila
    c.posicao_fila ASC NULLS LAST, 
    c.created_at ASC
$$;
