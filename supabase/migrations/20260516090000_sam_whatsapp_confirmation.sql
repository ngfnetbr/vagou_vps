DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'appointment_confirmation_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.appointment_confirmation_status AS ENUM (
      'pending',
      'confirmed',
      'declined',
      'assumed_confirmed'
    );
  END IF;
END $$;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS guardian_phone text;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_1h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_status public.appointment_confirmation_status,
  ADD COLUMN IF NOT EXISTS confirmation_response text,
  ADD COLUMN IF NOT EXISTS confirmation_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_source text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'criancas'
  ) THEN
    UPDATE public.students s
      SET guardian_phone = c.responsavel_telefone
    FROM public.criancas c
    WHERE c.id = s.id
      AND s.guardian_phone IS NULL
      AND c.responsavel_telefone IS NOT NULL
      AND btrim(c.responsavel_telefone) <> '';
  END IF;
END $$;
