-- Corrigir search_path da função de auditoria
CREATE OR REPLACE FUNCTION public.log_campos_inscricao_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.campos_inscricao_historico (campo_id, operacao, dados_novos, usuario_id)
    VALUES (NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.campos_inscricao_historico (campo_id, operacao, dados_anteriores, dados_novos, usuario_id)
    VALUES (NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.campos_inscricao_historico (campo_id, operacao, dados_anteriores, usuario_id)
    VALUES (OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;