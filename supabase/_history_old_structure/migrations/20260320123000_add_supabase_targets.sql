CREATE TABLE IF NOT EXISTS public.supabase_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  project_ref TEXT NOT NULL,
  db_password_enc TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (project_ref)
);

ALTER TABLE public.supabase_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmin view supabase targets" ON public.supabase_targets;
DROP POLICY IF EXISTS "Superadmin insert supabase targets" ON public.supabase_targets;
DROP POLICY IF EXISTS "Superadmin update supabase targets" ON public.supabase_targets;
DROP POLICY IF EXISTS "Superadmin delete supabase targets" ON public.supabase_targets;

CREATE POLICY "Superadmin view supabase targets"
ON public.supabase_targets
FOR SELECT
USING ((SELECT public.has_role(auth.uid(), 'superadmin')));

CREATE POLICY "Superadmin insert supabase targets"
ON public.supabase_targets
FOR INSERT
WITH CHECK ((SELECT public.has_role(auth.uid(), 'superadmin')));

CREATE POLICY "Superadmin update supabase targets"
ON public.supabase_targets
FOR UPDATE
USING ((SELECT public.has_role(auth.uid(), 'superadmin')))
WITH CHECK ((SELECT public.has_role(auth.uid(), 'superadmin')));

CREATE POLICY "Superadmin delete supabase targets"
ON public.supabase_targets
FOR DELETE
USING ((SELECT public.has_role(auth.uid(), 'superadmin')));

DROP TRIGGER IF EXISTS update_supabase_targets_updated_at ON public.supabase_targets;
CREATE TRIGGER update_supabase_targets_updated_at
BEFORE UPDATE ON public.supabase_targets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

