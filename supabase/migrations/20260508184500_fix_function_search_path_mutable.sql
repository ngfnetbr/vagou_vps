DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'enforce_superadmin_for_theme_colors'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    ALTER FUNCTION public.enforce_superadmin_for_theme_colors()
      SET search_path = pg_catalog, public;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'fix_latin1_encoding'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    ALTER FUNCTION public.fix_latin1_encoding(text)
      SET search_path = pg_catalog, public;
  END IF;
END $$;

