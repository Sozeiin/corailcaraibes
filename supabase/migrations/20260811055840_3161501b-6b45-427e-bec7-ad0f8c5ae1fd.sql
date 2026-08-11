DROP POLICY IF EXISTS "Purchase request images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Stock photos are publicly accessible" ON storage.objects;

CREATE POLICY "Stock photos readable by authenticated staff"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'stock-photos');
