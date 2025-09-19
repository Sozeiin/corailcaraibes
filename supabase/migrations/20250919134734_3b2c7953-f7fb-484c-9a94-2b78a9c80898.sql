-- Vérifier si le bucket existe et est public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'checklist-photos';

-- Supprimer les anciennes politiques qui pourraient causer des conflits
DROP POLICY IF EXISTS "Users can upload checklist photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view checklist photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete checklist photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update checklist photos" ON storage.objects;

-- Recréer les politiques avec des noms uniques et des permissions plus larges
CREATE POLICY "checklist_photos_upload_policy" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'checklist-photos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "checklist_photos_select_policy" ON storage.objects
FOR SELECT USING (
  bucket_id = 'checklist-photos'
);

CREATE POLICY "checklist_photos_delete_policy" ON storage.objects
FOR DELETE USING (
  bucket_id = 'checklist-photos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "checklist_photos_update_policy" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'checklist-photos' 
  AND auth.role() = 'authenticated'
);