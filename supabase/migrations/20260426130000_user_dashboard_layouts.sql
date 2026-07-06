-- User dashboard layouts (per-user widget positioning/visibility)
CREATE TABLE IF NOT EXISTS public.user_dashboard_layouts (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dashboard_key TEXT NOT NULL,
  layouts JSONB NOT NULL,
  hidden JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, dashboard_key)
);

ALTER TABLE public.user_dashboard_layouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User can manage own dashboard layouts" ON public.user_dashboard_layouts;
CREATE POLICY "User can manage own dashboard layouts"
  ON public.user_dashboard_layouts
  FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP TRIGGER IF EXISTS update_user_dashboard_layouts_updated_at ON public.user_dashboard_layouts;
CREATE TRIGGER update_user_dashboard_layouts_updated_at
  BEFORE UPDATE ON public.user_dashboard_layouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

