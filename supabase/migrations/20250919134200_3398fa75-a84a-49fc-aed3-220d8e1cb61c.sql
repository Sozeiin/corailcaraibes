-- Créer le bucket pour les photos de checklist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('checklist-photos', 'checklist-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Politique pour permettre aux utilisateurs authentifiés de télécharger des photos
CREATE POLICY "Users can upload checklist photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'checklist-photos' 
  AND auth.role() = 'authenticated'
);

-- Politique pour permettre aux utilisateurs de voir les photos
CREATE POLICY "Users can view checklist photos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'checklist-photos'
);

-- Politique pour permettre aux utilisateurs de supprimer leurs photos
CREATE POLICY "Users can delete checklist photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'checklist-photos' 
  AND auth.role() = 'authenticated'
);

-- Politique pour permettre la mise à jour des photos
CREATE POLICY "Users can update checklist photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'checklist-photos' 
  AND auth.role() = 'authenticated'
);