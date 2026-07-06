-- Atualizar função de auditoria para capturar IP e User Agent
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_ip text;
BEGIN
  -- Tentar capturar o IP do cliente
  BEGIN
    client_ip := inet_client_addr()::text;
  EXCEPTION WHEN OTHERS THEN
    client_ip := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.auditoria (
      tabela,
      operacao,
      registro_id,
      dados_novos,
      usuario_id,
      ip_address,
      created_at
    ) VALUES (
      TG_TABLE_NAME,
      TG_OP,
      NEW.id,
      to_jsonb(NEW),
      auth.uid(),
      client_ip,
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
      ip_address,
      created_at
    ) VALUES (
      TG_TABLE_NAME,
      TG_OP,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      auth.uid(),
      client_ip,
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
      ip_address,
      created_at
    ) VALUES (
      TG_TABLE_NAME,
      TG_OP,
      OLD.id,
      to_jsonb(OLD),
      auth.uid(),
      client_ip,
      now()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;