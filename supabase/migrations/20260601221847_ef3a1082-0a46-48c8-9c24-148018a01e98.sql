CREATE TABLE public.user_active_session (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_active_session TO authenticated;
GRANT ALL ON public.user_active_session TO service_role;

ALTER TABLE public.user_active_session ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own active session"
ON public.user_active_session
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own active session"
ON public.user_active_session
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own active session"
ON public.user_active_session
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own active session"
ON public.user_active_session
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

ALTER TABLE public.user_active_session REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_active_session;