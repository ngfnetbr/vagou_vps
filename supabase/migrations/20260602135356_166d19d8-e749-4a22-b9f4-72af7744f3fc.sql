DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sexo text;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS data_nascimento date;
  END IF;
END $$;