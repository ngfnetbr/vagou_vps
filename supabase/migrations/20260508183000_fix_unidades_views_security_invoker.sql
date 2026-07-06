CREATE OR REPLACE VIEW public.v_unidades_cmei_creche
WITH (security_invoker = true) AS
  SELECT *
  FROM public.cmeis
  WHERE tipo_unidade = 'cmei_creche';

CREATE OR REPLACE VIEW public.v_unidades_escolas
WITH (security_invoker = true) AS
  SELECT *
  FROM public.cmeis
  WHERE tipo_unidade = 'escola';
