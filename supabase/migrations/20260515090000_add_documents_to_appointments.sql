ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS document_url text;

