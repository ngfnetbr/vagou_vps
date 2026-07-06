CREATE TABLE IF NOT EXISTS public.integration_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  api_key text NOT NULL DEFAULT '',
  webhook_url text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT false,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read integration_configs" ON public.integration_configs;
CREATE POLICY "Admins can read integration_configs"
  ON public.integration_configs
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin(auth.uid())));

DROP POLICY IF EXISTS "Admins can insert integration_configs" ON public.integration_configs;
CREATE POLICY "Admins can insert integration_configs"
  ON public.integration_configs
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin(auth.uid())));

DROP POLICY IF EXISTS "Admins can update integration_configs" ON public.integration_configs;
CREATE POLICY "Admins can update integration_configs"
  ON public.integration_configs
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin(auth.uid())))
  WITH CHECK ((SELECT public.is_admin(auth.uid())));

DROP POLICY IF EXISTS "Admins can delete integration_configs" ON public.integration_configs;
CREATE POLICY "Admins can delete integration_configs"
  ON public.integration_configs
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin(auth.uid())));

DROP TRIGGER IF EXISTS set_integration_configs_updated_at ON public.integration_configs;
CREATE TRIGGER set_integration_configs_updated_at
  BEFORE UPDATE ON public.integration_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

