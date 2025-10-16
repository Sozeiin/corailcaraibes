-- Création de la table pour stocker plusieurs photos par item de checklist
CREATE TABLE IF NOT EXISTS checklist_item_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES boat_checklists(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  uploaded_at timestamptz DEFAULT now(),
  display_order integer DEFAULT 0
);

-- Index pour améliorer les performances
CREATE INDEX idx_checklist_item_photos_checklist 
  ON checklist_item_photos(checklist_id);
  
CREATE INDEX idx_checklist_item_photos_item 
  ON checklist_item_photos(checklist_id, item_id);

-- Activer RLS
ALTER TABLE checklist_item_photos ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir les photos des checklists de leur base
CREATE POLICY "Users can view checklist photos in their base"
ON checklist_item_photos FOR SELECT
USING (
  get_user_role() = 'direction'::user_role 
  OR EXISTS (
    SELECT 1 FROM boat_checklists bc
    JOIN boats b ON b.id = bc.boat_id
    WHERE bc.id = checklist_item_photos.checklist_id
    AND (bc.technician_id = auth.uid() OR b.base_id = get_user_base_id())
  )
);

-- Les utilisateurs peuvent insérer des photos pour les checklists de leur base
CREATE POLICY "Users can insert checklist photos in their base"
ON checklist_item_photos FOR INSERT
WITH CHECK (
  get_user_role() = 'direction'::user_role 
  OR EXISTS (
    SELECT 1 FROM boat_checklists bc
    JOIN boats b ON b.id = bc.boat_id
    WHERE bc.id = checklist_item_photos.checklist_id
    AND (bc.technician_id = auth.uid() OR b.base_id = get_user_base_id())
  )
);

-- Les utilisateurs peuvent supprimer des photos pour les checklists de leur base
CREATE POLICY "Users can delete checklist photos in their base"
ON checklist_item_photos FOR DELETE
USING (
  get_user_role() = 'direction'::user_role 
  OR EXISTS (
    SELECT 1 FROM boat_checklists bc
    JOIN boats b ON b.id = bc.boat_id
    WHERE bc.id = checklist_item_photos.checklist_id
    AND (bc.technician_id = auth.uid() OR b.base_id = get_user_base_id())
  )
);

-- Migrer les anciennes photos (photo_url) vers la nouvelle table
INSERT INTO checklist_item_photos (checklist_id, item_id, photo_url, display_order)
SELECT 
  checklist_id, 
  item_id, 
  photo_url, 
  0 as display_order
FROM boat_checklist_items
WHERE photo_url IS NOT NULL AND photo_url != '';