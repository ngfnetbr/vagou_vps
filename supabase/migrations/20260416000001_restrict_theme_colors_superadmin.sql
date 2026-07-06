-- Restringe alteração das cores do sistema (tema_cor_primaria/tema_cor_secundaria) apenas para SUPERADMIN

CREATE OR REPLACE FUNCTION public.enforce_superadmin_for_theme_colors()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (NEW.tema_cor_primaria IS DISTINCT FROM OLD.tema_cor_primaria)
     OR (NEW.tema_cor_secundaria IS DISTINCT FROM OLD.tema_cor_secundaria) THEN
    IF auth.uid() IS NULL OR auth.role() = 'service_role' THEN
      RETURN NEW;
    END IF;
    IF NOT public.has_role(auth.uid(), 'superadmin') THEN
      RAISE EXCEPTION 'Apenas SUPERADMIN pode alterar as cores do sistema';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_enforce_superadmin_for_theme_colors ON public.configuracoes_sistema;

CREATE TRIGGER tr_enforce_superadmin_for_theme_colors
BEFORE UPDATE ON public.configuracoes_sistema
FOR EACH ROW
EXECUTE FUNCTION public.enforce_superadmin_for_theme_colors();
