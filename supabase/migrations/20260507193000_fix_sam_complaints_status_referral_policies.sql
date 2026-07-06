ALTER TABLE public.school_complaints
  ADD COLUMN IF NOT EXISTS referral_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS referral_decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS referral_decided_by uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'school_complaints_referral_decided_by_fkey'
  ) THEN
    ALTER TABLE public.school_complaints
      ADD CONSTRAINT school_complaints_referral_decided_by_fkey
      FOREIGN KEY (referral_decided_by) REFERENCES public.profiles(id);
  END IF;
END $$;

UPDATE public.school_complaints
SET status = 'in_review'
WHERE status IN ('analyzing', 'in_progress');

UPDATE public.school_complaints
SET status = 'completed'
WHERE status IN ('resolved', 'closed');

UPDATE public.school_complaints
SET referral_status = 'requested'
WHERE referral_requested = true
  AND (referral_status IS NULL OR referral_status = 'none');

UPDATE public.school_complaints
SET referral_requested = (referral_status <> 'none')
WHERE referral_requested IS DISTINCT FROM (referral_status <> 'none');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'school_complaints_status_check'
  ) THEN
    ALTER TABLE public.school_complaints
      ADD CONSTRAINT school_complaints_status_check
      CHECK (status IN ('pending', 'in_review', 'scheduled', 'completed', 'rejected', 'analyzing', 'in_progress', 'resolved', 'closed'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'school_complaints_referral_status_check'
  ) THEN
    ALTER TABLE public.school_complaints
      ADD CONSTRAINT school_complaints_referral_status_check
      CHECK (referral_status IN ('none', 'requested', 'accepted', 'rejected'));
  END IF;
END $$;

DROP POLICY IF EXISTS "Admins and school team can manage complaints" ON public.school_complaints;
DROP POLICY IF EXISTS "Admins and professionals can update complaints" ON public.school_complaints;
DROP POLICY IF EXISTS "Admins and professionals can delete complaints" ON public.school_complaints;

CREATE POLICY "Admins and professionals can update complaints"
  ON public.school_complaints FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'professional'::text)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'professional'::text)
  );

CREATE POLICY "Admins and professionals can delete complaints"
  ON public.school_complaints FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'professional'::text)
  );
