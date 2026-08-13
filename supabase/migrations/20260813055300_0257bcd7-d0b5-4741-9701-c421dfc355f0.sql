DROP POLICY IF EXISTS "checklist_photos_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "Stock photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Purchase request images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Checklist photos are publicly accessible" ON storage.objects;

DROP POLICY IF EXISTS "Users can view purchase request photos" ON storage.objects;
CREATE POLICY "Purchase request files readable by authenticated staff"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'purchase-requests');

DROP POLICY IF EXISTS "Users can delete their purchase request photos" ON storage.objects;
CREATE POLICY "Purchase request files deletable by owner or direction"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'purchase-requests'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR get_user_role() = 'direction'::user_role
  )
);

DROP POLICY IF EXISTS "Checklist photos readable by their base" ON storage.objects;
CREATE POLICY "Checklist photos readable by their base"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'checklist-photos'
  AND (
    get_user_role() = 'direction'::user_role
    OR split_part(name, '/', 1) = 'temp'
    OR EXISTS (
      SELECT 1
      FROM boat_checklists bc
      JOIN boats b ON b.id = bc.boat_id
      WHERE b.base_id = get_user_base_id()
        AND (bc.id)::text = split_part(objects.name, '/', 1)
    )
  )
);