
-- 1. Add registration_number to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS registration_number text;

-- 2. Create appointment_records table for the prontuario flow
CREATE TABLE IF NOT EXISTS public.appointment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.profiles(id),
  specialty text,
  registration_number text,
  is_first_visit boolean NOT NULL DEFAULT false,
  anamnesis_data jsonb DEFAULT '{}'::jsonb,
  summary text,
  return_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.appointment_records ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies
CREATE POLICY "Records viewable by authenticated users"
  ON public.appointment_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Professionals can insert records"
  ON public.appointment_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = professional_id);

CREATE POLICY "Professionals can update own records"
  ON public.appointment_records FOR UPDATE
  TO authenticated
  USING (auth.uid() = professional_id);

-- 5. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_appointment_records_student_prof
  ON public.appointment_records(student_id, professional_id);

CREATE INDEX IF NOT EXISTS idx_appointment_records_student_first
  ON public.appointment_records(student_id, is_first_visit);

-- 6. Updated_at trigger
CREATE TRIGGER update_appointment_records_updated_at
  BEFORE UPDATE ON public.appointment_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
