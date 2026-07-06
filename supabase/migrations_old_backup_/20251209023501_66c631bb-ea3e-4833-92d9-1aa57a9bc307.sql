-- Função pública para obter ocupação dos CMEIs (SECURITY DEFINER para funcionar sem auth)
CREATE OR REPLACE FUNCTION public.get_ocupacao_cmeis()
RETURNS TABLE (
  id uuid,
  nome text,
  endereco text,
  bairro text,
  telefone text,
  email text,
  latitude double precision,
  longitude double precision,
  capacidade_total integer,
  ocupados bigint,
  percentual integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.nome,
    c.endereco,
    c.bairro,
    c.telefone,
    c.email,
    c.latitude,
    c.longitude,
    c.capacidade_total,
    COALESCE(
      (SELECT COUNT(*) 
       FROM criancas cr 
       WHERE cr.cmei_atual_id = c.id 
       AND cr.status IN ('Matriculado', 'Matriculada', 'Convocado', 'Aguardando Documentação')
      ), 0
    ) as ocupados,
    CASE 
      WHEN c.capacidade_total > 0 THEN 
        ROUND(
          (COALESCE(
            (SELECT COUNT(*) 
             FROM criancas cr 
             WHERE cr.cmei_atual_id = c.id 
             AND cr.status IN ('Matriculado', 'Matriculada', 'Convocado', 'Aguardando Documentação')
            ), 0
          )::numeric / c.capacidade_total::numeric) * 100
        )::integer
      ELSE 0
    END as percentual
  FROM cmeis c
  WHERE c.ativo = true
  ORDER BY c.nome
$$;

-- Função pública para obter ocupação das turmas (SECURITY DEFINER para funcionar sem auth)
CREATE OR REPLACE FUNCTION public.get_ocupacao_turmas()
RETURNS TABLE (
  id uuid,
  nome text,
  turma_base text,
  turno text,
  capacidade integer,
  ocupados bigint,
  percentual integer,
  cmei_id uuid,
  cmei_nome text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    t.id,
    t.nome,
    t.turma_base,
    t.turno,
    t.capacidade,
    COALESCE(
      (SELECT COUNT(*) 
       FROM criancas cr 
       WHERE cr.turma_atual_id = t.id 
       AND cr.status IN ('Matriculado', 'Matriculada', 'Convocado', 'Aguardando Documentação')
      ), 0
    ) as ocupados,
    CASE 
      WHEN t.capacidade > 0 THEN 
        ROUND(
          (COALESCE(
            (SELECT COUNT(*) 
             FROM criancas cr 
             WHERE cr.turma_atual_id = t.id 
             AND cr.status IN ('Matriculado', 'Matriculada', 'Convocado', 'Aguardando Documentação')
            ), 0
          )::numeric / t.capacidade::numeric) * 100
        )::integer
      ELSE 0
    END as percentual,
    t.cmei_id,
    COALESCE(c.nome, 'Sem CMEI') as cmei_nome
  FROM turmas t
  LEFT JOIN cmeis c ON t.cmei_id = c.id
  WHERE t.ativo = true
  ORDER BY t.turma_base, t.nome
$$;