-- Alterar tipo das colunas de coordenadas para double precision
ALTER TABLE public.configuracoes_sistema 
  ALTER COLUMN endereco_latitude TYPE double precision,
  ALTER COLUMN endereco_longitude TYPE double precision;