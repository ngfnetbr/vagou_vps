CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  headers_text TEXT;
  headers_json JSONB;
  ip TEXT;
  ua TEXT;
  ref TEXT;
  req_method TEXT;
  req_path TEXT;
  new_json JSONB;
  old_json JSONB;
  pk JSONB;
  reg_id UUID;
  actor_id UUID;
BEGIN
  headers_text := current_setting('request.headers', true);
  IF headers_text IS NOT NULL THEN
    BEGIN
      headers_json := headers_text::jsonb;
    EXCEPTION WHEN others THEN
      headers_json := NULL;
    END;
  END IF;

  IF headers_json IS NOT NULL THEN
    ip := COALESCE(
      headers_json->>'x-forwarded-for',
      headers_json->>'x-real-ip',
      headers_json->>'cf-connecting-ip'
    );
    IF ip IS NOT NULL THEN
      ip := btrim(split_part(ip, ',', 1));
    END IF;

    ua := headers_json->>'user-agent';
    ref := headers_json->>'referer';
  END IF;

  req_method := current_setting('request.method', true);
  req_path := current_setting('request.path', true);

  IF TG_OP = 'INSERT' THEN
    new_json := to_jsonb(NEW);
    pk := public.audit_get_pk_json(TG_RELID, new_json);
    reg_id := NULL;
    BEGIN
      reg_id := (pk->>'id')::uuid;
    EXCEPTION WHEN others THEN
      reg_id := NULL;
    END;

    actor_id := auth.uid();
    IF actor_id IS NULL THEN
      BEGIN
        actor_id := (new_json->>'usuario_id')::uuid;
      EXCEPTION WHEN others THEN
        actor_id := NULL;
      END;
    END IF;

    INSERT INTO public.auditoria (
      tabela,
      operacao,
      registro_id,
      registro_pk,
      dados_novos,
      usuario_id,
      ip_address,
      user_agent,
      referer,
      request_method,
      request_path,
      transaction_id,
      created_at
    ) VALUES (
      TG_TABLE_NAME,
      TG_OP,
      reg_id,
      pk,
      new_json,
      actor_id,
      ip,
      ua,
      ref,
      req_method,
      req_path,
      txid_current(),
      now()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    old_json := to_jsonb(OLD);
    new_json := to_jsonb(NEW);
    pk := public.audit_get_pk_json(TG_RELID, new_json);
    reg_id := NULL;
    BEGIN
      reg_id := (pk->>'id')::uuid;
    EXCEPTION WHEN others THEN
      reg_id := NULL;
    END;

    actor_id := auth.uid();
    IF actor_id IS NULL THEN
      BEGIN
        actor_id := (new_json->>'usuario_id')::uuid;
      EXCEPTION WHEN others THEN
        actor_id := NULL;
      END;
    END IF;
    IF actor_id IS NULL THEN
      BEGIN
        actor_id := (old_json->>'usuario_id')::uuid;
      EXCEPTION WHEN others THEN
        actor_id := NULL;
      END;
    END IF;

    INSERT INTO public.auditoria (
      tabela,
      operacao,
      registro_id,
      registro_pk,
      dados_antigos,
      dados_novos,
      usuario_id,
      ip_address,
      user_agent,
      referer,
      request_method,
      request_path,
      transaction_id,
      created_at
    ) VALUES (
      TG_TABLE_NAME,
      TG_OP,
      reg_id,
      pk,
      old_json,
      new_json,
      actor_id,
      ip,
      ua,
      ref,
      req_method,
      req_path,
      txid_current(),
      now()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    old_json := to_jsonb(OLD);
    pk := public.audit_get_pk_json(TG_RELID, old_json);
    reg_id := NULL;
    BEGIN
      reg_id := (pk->>'id')::uuid;
    EXCEPTION WHEN others THEN
      reg_id := NULL;
    END;

    actor_id := auth.uid();
    IF actor_id IS NULL THEN
      BEGIN
        actor_id := (old_json->>'usuario_id')::uuid;
      EXCEPTION WHEN others THEN
        actor_id := NULL;
      END;
    END IF;

    INSERT INTO public.auditoria (
      tabela,
      operacao,
      registro_id,
      registro_pk,
      dados_antigos,
      usuario_id,
      ip_address,
      user_agent,
      referer,
      request_method,
      request_path,
      transaction_id,
      created_at
    ) VALUES (
      TG_TABLE_NAME,
      TG_OP,
      reg_id,
      pk,
      old_json,
      actor_id,
      ip,
      ua,
      ref,
      req_method,
      req_path,
      txid_current(),
      now()
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;
