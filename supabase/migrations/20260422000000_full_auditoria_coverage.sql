ALTER TABLE public.auditoria
  ADD COLUMN IF NOT EXISTS registro_pk JSONB,
  ADD COLUMN IF NOT EXISTS request_method TEXT,
  ADD COLUMN IF NOT EXISTS request_path TEXT,
  ADD COLUMN IF NOT EXISTS referer TEXT,
  ADD COLUMN IF NOT EXISTS transaction_id BIGINT;

CREATE OR REPLACE FUNCTION public.audit_get_pk_json(p_table regclass, p_row jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT jsonb_object_agg(a.attname, p_row -> a.attname)
      FROM pg_index i
      JOIN pg_attribute a
        ON a.attrelid = i.indrelid
       AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = p_table
        AND i.indisprimary
    ),
    '{}'::jsonb
  );
$$;

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
      auth.uid(),
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
      auth.uid(),
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
      auth.uid(),
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

ALTER TABLE public.historico
  ALTER COLUMN usuario_id SET DEFAULT auth.uid();

ALTER TABLE public.notificacoes_log
  ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES auth.users(id);

DO $$
DECLARE
  r RECORD;
  t RECORD;
  trg_name TEXT;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname <> 'auditoria'
  LOOP
    FOR t IN
      SELECT tgname
      FROM pg_trigger tg
      JOIN pg_proc p ON p.oid = tg.tgfoid
      WHERE tg.tgrelid = format('%I.%I', r.schema_name, r.table_name)::regclass
        AND NOT tg.tgisinternal
        AND p.proname = 'audit_trigger_function'
        AND p.pronamespace = 'public'::regnamespace
    LOOP
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I.%I;', t.tgname, r.schema_name, r.table_name);
    END LOOP;

    trg_name := left('audit_' || r.table_name || '_trigger', 63);
    EXECUTE format(
      'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON %I.%I FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();',
      trg_name,
      r.schema_name,
      r.table_name
    );
  END LOOP;
END $$;
