-- Adiciona coluna de thumbnail estática para aulas
ALTER TABLE public.aulas
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Nenhuma mudança de RLS necessária: SELECT já coberto por políticas da tabela
-- Frontend usará thumbnail_url quando disponível, com fallback para prévia do vídeo.
