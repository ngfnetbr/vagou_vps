-- Função de auditoria que captura INSERT, UPDATE e DELETE
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.auditoria (
      tabela,
      operacao,
      registro_id,
      dados_novos,
      usuario_id,
      created_at
    ) VALUES (
      TG_TABLE_NAME,
      TG_OP,
      NEW.id,
      to_jsonb(NEW),
      auth.uid(),
      now()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.auditoria (
      tabela,
      operacao,
      registro_id,
      dados_antigos,
      dados_novos,
      usuario_id,
      created_at
    ) VALUES (
      TG_TABLE_NAME,
      TG_OP,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      auth.uid(),
      now()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.auditoria (
      tabela,
      operacao,
      registro_id,
      dados_antigos,
      usuario_id,
      created_at
    ) VALUES (
      TG_TABLE_NAME,
      TG_OP,
      OLD.id,
      to_jsonb(OLD),
      auth.uid(),
      now()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger para tabela criancas
CREATE TRIGGER audit_criancas_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.criancas
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Trigger para tabela configuracoes_sistema
CREATE TRIGGER audit_configuracoes_sistema_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.configuracoes_sistema
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Trigger para tabela user_roles
CREATE TRIGGER audit_user_roles_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Trigger para tabela cmeis
CREATE TRIGGER audit_cmeis_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.cmeis
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Trigger para tabela turmas
CREATE TRIGGER audit_turmas_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.turmas
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();