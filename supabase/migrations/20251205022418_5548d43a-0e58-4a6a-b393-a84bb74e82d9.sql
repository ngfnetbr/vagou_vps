-- Remover a política de fila pública que expõe todos os dados
DROP POLICY IF EXISTS "Public can view fila de espera" ON public.criancas;

-- Criar função segura que retorna apenas dados públicos da fila
CREATE OR REPLACE FUNCTION public.get_fila_publica()
RETURNS TABLE (
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
  cmei2_nome text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    -- Retorna nome abreviado (primeiro nome + inicial do sobrenome)
    CASE 
      WHEN position(' ' in c.nome) > 0 
      THEN split_part(c.nome, ' ', 1) || ' ' || substr(split_part(c.nome, ' ', array_length(string_to_array(c.nome, ' '), 1)), 1, 1) || '.'
      ELSE c.nome
    END as nome,
    c.data_nascimento,
    c.sexo::text,
    c.status::text,
    c.posicao_fila,
    c.prioridade::text,
    c.programas_sociais,
    c.created_at,
    cmei1.nome as cmei1_nome,
    cmei2.nome as cmei2_nome
  FROM criancas c
  LEFT JOIN cmeis cmei1 ON c.cmei1_preferencia = cmei1.id
  LEFT JOIN cmeis cmei2 ON c.cmei2_preferencia = cmei2.id
  WHERE c.status IN ('Fila de Espera', 'Convocado')
  ORDER BY c.posicao_fila ASC NULLS LAST, c.created_at ASC
$$;