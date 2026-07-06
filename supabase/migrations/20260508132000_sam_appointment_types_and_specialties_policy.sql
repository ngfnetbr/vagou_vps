CREATE TABLE IF NOT EXISTS public.appointment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.appointment_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read appointment types" ON public.appointment_types;
CREATE POLICY "Authenticated can read appointment types"
  ON public.appointment_types FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins and professionals can manage appointment types" ON public.appointment_types;
CREATE POLICY "Admins and professionals can manage appointment types"
  ON public.appointment_types FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'professional'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'professional'::public.app_role)
  );

DROP POLICY IF EXISTS "Admins can manage specialties" ON public.specialties;
DROP POLICY IF EXISTS "Admins and professionals can manage specialties" ON public.specialties;
CREATE POLICY "Admins and professionals can manage specialties"
  ON public.specialties FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'professional'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'professional'::public.app_role)
  );

