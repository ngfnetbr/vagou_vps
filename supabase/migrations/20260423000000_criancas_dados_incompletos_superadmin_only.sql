ALTER TABLE public.criancas
ADD COLUMN IF NOT EXISTS dados_incompletos boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.trg_criancas_dados_incompletos_superadmin_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.dados_incompletos, false) AND NOT (SELECT public.has_role(auth.uid(), 'superadmin')) THEN
      RAISE EXCEPTION 'Somente superadmin pode cadastrar/importar crianças com dados incompletos'
        USING ERRCODE = '42501';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.dados_incompletos, false) AND NOT COALESCE(OLD.dados_incompletos, false) AND NOT (SELECT public.has_role(auth.uid(), 'superadmin')) THEN
      RAISE EXCEPTION 'Somente superadmin pode marcar crianças como dados incompletos'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_criancas_dados_incompletos_superadmin_only ON public.criancas;
CREATE TRIGGER tr_criancas_dados_incompletos_superadmin_only
BEFORE INSERT OR UPDATE ON public.criancas
FOR EACH ROW
EXECUTE FUNCTION public.trg_criancas_dados_incompletos_superadmin_only();

