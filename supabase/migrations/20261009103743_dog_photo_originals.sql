ALTER TABLE public.dogs ADD COLUMN photo_path text;
CREATE POLICY "dog photos read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'dog-photos');
CREATE POLICY "dog photos insert" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'dog-photos');
CREATE POLICY "dog photos delete" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'dog-photos');