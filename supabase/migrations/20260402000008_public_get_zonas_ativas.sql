DROP FUNCTION IF EXISTS public.get_zonas_atendimento_ativas_publicas();

CREATE OR REPLACE FUNCTION public.get_zonas_atendimento_ativas_publicas()
RETURNS TABLE (
  id uuid,
  nome text,
  descricao text,
  cor text,
  bairros text[],
  ceps text[],
  poligono jsonb,
  ativo boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    z.id,
    z.nome,
    z.descricao,
    z.cor,
    z.bairros,
    z.ceps,
    z.poligono,
    z.ativo,
    z.created_at,
    z.updated_at
  FROM public.zonas_atendimento z
  WHERE z.ativo = true
  ORDER BY z.nome ASC;
$$;

