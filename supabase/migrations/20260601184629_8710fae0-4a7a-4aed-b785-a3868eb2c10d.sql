-- Replace the overly-permissive UPDATE/DELETE policies on the assets bucket
-- with ownership-checked versions so users can only modify their own files.

DROP POLICY IF EXISTS "Authenticated can update assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete assets" ON storage.objects;

CREATE POLICY "Owners can update their assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'assets' AND auth.uid() = owner)
WITH CHECK (bucket_id = 'assets' AND auth.uid() = owner);

CREATE POLICY "Owners can delete their assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'assets' AND auth.uid() = owner);