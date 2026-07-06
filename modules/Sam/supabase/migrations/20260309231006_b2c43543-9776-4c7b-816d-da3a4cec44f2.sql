
ALTER TABLE public.appointments 
  ADD COLUMN IF NOT EXISTS complaint_id uuid REFERENCES public.school_complaints(id);
