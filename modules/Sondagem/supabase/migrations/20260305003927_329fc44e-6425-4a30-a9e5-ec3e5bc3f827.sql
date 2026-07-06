
-- 1. Add new enum values
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'equipe_pedagogica';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'coordenador';
