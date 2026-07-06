-- Fix set_user_cmei_by_email: add admin role check
CREATE OR REPLACE FUNCTION public.set_user_cmei_by_email(_email text, _cmei_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  -- Guard: only admins can call this
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;
  SELECT id INTO _user_id FROM auth.users WHERE email = _email LIMIT 1;
  IF _user_id IS NOT NULL THEN
    UPDATE public.profiles SET cmei_id = _cmei_id WHERE id = _user_id;
  END IF;
END;
$$;

-- Fix storage delete policy: restrict to admins and file owners
DROP POLICY IF EXISTS "Admins and owners can delete solicitacao files" ON storage.objects;
CREATE POLICY "Admins and owners can delete solicitacao files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'solicitacoes-arquivos' AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    owner = auth.uid()
  )
);