-- Add photo_url column to boat_checklist_items table
ALTER TABLE public.boat_checklist_items 
ADD COLUMN photo_url text;

-- Create storage bucket for checklist photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('checklist-photos', 'checklist-photos', false);

-- Create RLS policies for checklist photos
CREATE POLICY "Users can view checklist photos for their base" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'checklist-photos' AND 
  (
    get_user_role() = 'direction' OR
    EXISTS (
      SELECT 1 FROM boat_checklists bc
      JOIN boats b ON b.id = bc.boat_id
      WHERE b.base_id = get_user_base_id()
      AND SPLIT_PART(name, '/', 1) = bc.id::text
    )
  )
);

CREATE POLICY "Users can upload checklist photos for their base" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'checklist-photos' AND 
  (
    get_user_role() = 'direction' OR
    EXISTS (
      SELECT 1 FROM boat_checklists bc
      JOIN boats b ON b.id = bc.boat_id
      WHERE b.base_id = get_user_base_id()
      AND SPLIT_PART(name, '/', 1) = bc.id::text
    )
  )
);

CREATE POLICY "Users can update checklist photos for their base" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'checklist-photos' AND 
  (
    get_user_role() = 'direction' OR
    EXISTS (
      SELECT 1 FROM boat_checklists bc
      JOIN boats b ON b.id = bc.boat_id
      WHERE b.base_id = get_user_base_id()
      AND SPLIT_PART(name, '/', 1) = bc.id::text
    )
  )
);

CREATE POLICY "Users can delete checklist photos for their base" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'checklist-photos' AND 
  (
    get_user_role() = 'direction' OR
    EXISTS (
      SELECT 1 FROM boat_checklists bc
      JOIN boats b ON b.id = bc.boat_id
      WHERE b.base_id = get_user_base_id()
      AND SPLIT_PART(name, '/', 1) = bc.id::text
    )
  )
);