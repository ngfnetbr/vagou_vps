-- Remove the broad public SELECT/list policy. Public files remain accessible
-- through their direct public URLs (public bucket), but anonymous clients can
-- no longer enumerate/list all files in the bucket.
DROP POLICY IF EXISTS "Public can read assets" ON storage.objects;