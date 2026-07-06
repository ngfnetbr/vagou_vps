ALTER TABLE public.campos_inscricao
ADD COLUMN IF NOT EXISTS depende_de text,
ADD COLUMN IF NOT EXISTS depende_valor text;

