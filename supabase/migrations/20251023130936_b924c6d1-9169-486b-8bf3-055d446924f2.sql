-- Phase 1.1: Ajouter colonnes ONE WAY à administrative_checkin_forms
ALTER TABLE administrative_checkin_forms
ADD COLUMN IF NOT EXISTS is_one_way BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS destination_base_id UUID REFERENCES bases(id);

-- Phase 1.2: Créer table boat_sharing
CREATE TABLE IF NOT EXISTS boat_sharing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boat_id UUID NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
  owner_base_id UUID NOT NULL REFERENCES bases(id),
  shared_with_base_id UUID NOT NULL REFERENCES bases(id),
  sharing_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  sharing_end_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'transferred')),
  checkin_form_id UUID REFERENCES administrative_checkin_forms(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_boat_sharing_boat_id ON boat_sharing(boat_id);
CREATE INDEX IF NOT EXISTS idx_boat_sharing_shared_with_base_id ON boat_sharing(shared_with_base_id);
CREATE INDEX IF NOT EXISTS idx_boat_sharing_status ON boat_sharing(status);

-- Phase 1.3: RLS pour boat_sharing
ALTER TABLE boat_sharing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bases can view their boat sharing" ON boat_sharing;
CREATE POLICY "Bases can view their boat sharing"
ON boat_sharing FOR SELECT
USING (
  get_user_role() = 'direction'::user_role OR
  owner_base_id = get_user_base_id() OR
  shared_with_base_id = get_user_base_id()
);

DROP POLICY IF EXISTS "Direction and chef_base can manage boat sharing" ON boat_sharing;
CREATE POLICY "Direction and chef_base can manage boat sharing"
ON boat_sharing FOR ALL
USING (
  (get_user_role() IN ('direction'::user_role, 'chef_base'::user_role)) AND
  (get_user_role() = 'direction'::user_role OR owner_base_id = get_user_base_id())
);

-- Phase 1.4: Mettre à jour RLS de boats
DROP POLICY IF EXISTS "Users can view boats in their base or all if direction" ON boats;
DROP POLICY IF EXISTS "Users can view owned or shared boats" ON boats;

CREATE POLICY "Users can view owned or shared boats"
ON boats FOR SELECT
USING (
  get_user_role() = 'direction'::user_role OR
  base_id = get_user_base_id() OR
  EXISTS (
    SELECT 1 FROM boat_sharing bs
    WHERE bs.boat_id = boats.id
    AND bs.shared_with_base_id = get_user_base_id()
    AND bs.status = 'active'
  )
);

-- Phase 1.5: Mettre à jour RLS de boat_checklists (CRITIQUE)
DROP POLICY IF EXISTS "Users can manage boat checklists" ON boat_checklists;
DROP POLICY IF EXISTS "Users can manage boat checklists including shared" ON boat_checklists;

CREATE POLICY "Users can manage boat checklists including shared"
ON boat_checklists FOR ALL
USING (
  get_user_role() = 'direction'::user_role OR
  technician_id = auth.uid() OR
  EXISTS (SELECT 1 FROM boats b WHERE b.id = boat_checklists.boat_id AND b.base_id = get_user_base_id()) OR
  EXISTS (
    SELECT 1 FROM boat_sharing bs
    WHERE bs.boat_id = boat_checklists.boat_id
    AND bs.shared_with_base_id = get_user_base_id()
    AND bs.status = 'active'
  )
)
WITH CHECK (
  get_user_role() = 'direction'::user_role OR
  technician_id = auth.uid() OR
  EXISTS (SELECT 1 FROM boats b WHERE b.id = boat_checklists.boat_id AND b.base_id = get_user_base_id()) OR
  EXISTS (
    SELECT 1 FROM boat_sharing bs
    WHERE bs.boat_id = boat_checklists.boat_id
    AND bs.shared_with_base_id = get_user_base_id()
    AND bs.status = 'active'
  )
);

-- Phase 1.6: Mettre à jour RLS de boat_rentals
DROP POLICY IF EXISTS "Users can manage boat rentals" ON boat_rentals;
DROP POLICY IF EXISTS "Users can manage boat rentals including shared" ON boat_rentals;

CREATE POLICY "Users can manage boat rentals including shared"
ON boat_rentals FOR ALL
USING (
  get_user_role() = 'direction'::user_role OR
  base_id = get_user_base_id() OR
  EXISTS (SELECT 1 FROM boats b WHERE b.id = boat_rentals.boat_id AND b.base_id = get_user_base_id()) OR
  EXISTS (
    SELECT 1 FROM boat_sharing bs
    WHERE bs.boat_id = boat_rentals.boat_id
    AND bs.shared_with_base_id = get_user_base_id()
    AND bs.status = 'active'
  )
)
WITH CHECK (
  get_user_role() = 'direction'::user_role OR
  base_id = get_user_base_id() OR
  EXISTS (SELECT 1 FROM boats b WHERE b.id = boat_rentals.boat_id AND b.base_id = get_user_base_id()) OR
  EXISTS (
    SELECT 1 FROM boat_sharing bs
    WHERE bs.boat_id = boat_rentals.boat_id
    AND bs.shared_with_base_id = get_user_base_id()
    AND bs.status = 'active'
  )
);

-- Phase 1.7: Trigger d'activation automatique
CREATE OR REPLACE FUNCTION activate_one_way_sharing()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_one_way = true 
     AND NEW.destination_base_id IS NOT NULL 
     AND NEW.boat_id IS NOT NULL 
     AND NEW.status = 'ready' THEN
    
    INSERT INTO boat_sharing (
      boat_id,
      owner_base_id,
      shared_with_base_id,
      sharing_start_date,
      sharing_end_date,
      status,
      checkin_form_id
    )
    VALUES (
      NEW.boat_id,
      (SELECT base_id FROM boats WHERE id = NEW.boat_id),
      NEW.destination_base_id,
      NEW.planned_start_date,
      NEW.planned_end_date,
      'active',
      NEW.id
    )
    ON CONFLICT (boat_id, shared_with_base_id) 
    WHERE status = 'active'
    DO UPDATE SET
      sharing_start_date = EXCLUDED.sharing_start_date,
      sharing_end_date = EXCLUDED.sharing_end_date,
      checkin_form_id = EXCLUDED.checkin_form_id,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS trg_activate_one_way_sharing ON administrative_checkin_forms;
CREATE TRIGGER trg_activate_one_way_sharing
AFTER INSERT OR UPDATE ON administrative_checkin_forms
FOR EACH ROW
EXECUTE FUNCTION activate_one_way_sharing();

-- Phase 1.8: Vue boat_complete_history (CORRECTED: proper status cast)
CREATE OR REPLACE VIEW boat_complete_history AS
SELECT 
  'checklist' as event_type,
  bc.id,
  bc.boat_id,
  bc.checklist_date::timestamp with time zone as event_date,
  b.base_id as event_base_id,
  bases.name as base_name,
  p.name as technician_name,
  bc.overall_status::text as status,
  bc.general_notes as notes
FROM boat_checklists bc
JOIN boats b ON b.id = bc.boat_id
LEFT JOIN bases ON bases.id = b.base_id
LEFT JOIN profiles p ON p.id = bc.technician_id

UNION ALL

SELECT 
  'intervention' as event_type,
  i.id,
  i.boat_id,
  i.scheduled_date as event_date,
  i.base_id as event_base_id,
  bases.name as base_name,
  p.name as technician_name,
  i.status::text as status,
  i.description as notes
FROM interventions i
LEFT JOIN bases ON bases.id = i.base_id
LEFT JOIN profiles p ON p.id = i.technician_id

ORDER BY event_date DESC;

-- Phase 1.9: Table boat_base_transfers
CREATE TABLE IF NOT EXISTS boat_base_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boat_id UUID NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
  from_base_id UUID NOT NULL REFERENCES bases(id),
  to_base_id UUID NOT NULL REFERENCES bases(id),
  transfer_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reason TEXT,
  transferred_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE boat_base_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view transfers for their bases" ON boat_base_transfers;
CREATE POLICY "Users can view transfers for their bases"
ON boat_base_transfers FOR SELECT
USING (
  get_user_role() = 'direction'::user_role OR
  from_base_id = get_user_base_id() OR
  to_base_id = get_user_base_id()
);

DROP POLICY IF EXISTS "Direction can manage transfers" ON boat_base_transfers;
CREATE POLICY "Direction can manage transfers"
ON boat_base_transfers FOR ALL
USING (get_user_role() = 'direction'::user_role);