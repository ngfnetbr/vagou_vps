INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'assets');

CREATE POLICY "Authenticated can upload assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'assets');

CREATE POLICY "Authenticated can update assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'assets');

CREATE POLICY "Authenticated can delete assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'assets');