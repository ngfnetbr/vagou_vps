
ALTER TABLE public.school_complaints 
  ADD COLUMN IF NOT EXISTS laudo_type text,
  ADD COLUMN IF NOT EXISTS referral_requested boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS referral_notes text;
