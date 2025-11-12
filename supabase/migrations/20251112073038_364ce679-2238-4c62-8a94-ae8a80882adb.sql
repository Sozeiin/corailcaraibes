-- Ajouter colonnes de tracking et workflow à shipment_preparations
ALTER TABLE shipment_preparations
ADD COLUMN IF NOT EXISTS expected_delivery_date DATE,
ADD COLUMN IF NOT EXISTS actual_delivery_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tracking_number TEXT,
ADD COLUMN IF NOT EXISTS carrier TEXT,
ADD COLUMN IF NOT EXISTS received_boxes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS received_items INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reception_notes TEXT;

-- Créer table de réception des articles
CREATE TABLE IF NOT EXISTS shipment_receptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preparation_id UUID NOT NULL REFERENCES shipment_preparations(id) ON DELETE CASCADE,
  box_id UUID REFERENCES shipment_boxes(id) ON DELETE SET NULL,
  box_identifier TEXT NOT NULL,
  item_reference TEXT,
  item_name TEXT NOT NULL,
  expected_quantity INTEGER DEFAULT 0,
  received_quantity INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  scanned_by UUID REFERENCES profiles(id),
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- Créer table des écarts/problèmes
CREATE TABLE IF NOT EXISTS shipment_discrepancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preparation_id UUID NOT NULL REFERENCES shipment_preparations(id) ON DELETE CASCADE,
  reception_id UUID REFERENCES shipment_receptions(id) ON DELETE CASCADE,
  discrepancy_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  description TEXT NOT NULL,
  resolution TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES profiles(id),
  photo_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_shipment_receptions_preparation ON shipment_receptions(preparation_id);
CREATE INDEX IF NOT EXISTS idx_shipment_receptions_reference ON shipment_receptions(item_reference);
CREATE INDEX IF NOT EXISTS idx_shipment_discrepancies_preparation ON shipment_discrepancies(preparation_id);

-- RLS policies pour shipment_receptions
ALTER TABLE shipment_receptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view receptions for their base"
ON shipment_receptions FOR SELECT
USING (
  get_user_role() = 'direction'::user_role
  OR EXISTS (
    SELECT 1 FROM shipment_preparations sp
    WHERE sp.id = preparation_id
    AND (sp.destination_base_id = get_user_base_id() OR sp.source_base_id = get_user_base_id())
  )
);

CREATE POLICY "Users can insert receptions for their base"
ON shipment_receptions FOR INSERT
WITH CHECK (
  get_user_role() = 'direction'::user_role
  OR EXISTS (
    SELECT 1 FROM shipment_preparations sp
    WHERE sp.id = preparation_id
    AND sp.destination_base_id = get_user_base_id()
  )
);

CREATE POLICY "Users can update receptions for their base"
ON shipment_receptions FOR UPDATE
USING (
  get_user_role() = 'direction'::user_role
  OR EXISTS (
    SELECT 1 FROM shipment_preparations sp
    WHERE sp.id = preparation_id
    AND sp.destination_base_id = get_user_base_id()
  )
);

-- RLS policies pour shipment_discrepancies
ALTER TABLE shipment_discrepancies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view discrepancies for their base"
ON shipment_discrepancies FOR SELECT
USING (
  get_user_role() = 'direction'::user_role
  OR EXISTS (
    SELECT 1 FROM shipment_preparations sp
    WHERE sp.id = preparation_id
    AND (sp.destination_base_id = get_user_base_id() OR sp.source_base_id = get_user_base_id())
  )
);

CREATE POLICY "Users can manage discrepancies for their base"
ON shipment_discrepancies FOR ALL
USING (
  get_user_role() = 'direction'::user_role
  OR EXISTS (
    SELECT 1 FROM shipment_preparations sp
    WHERE sp.id = preparation_id
    AND sp.destination_base_id = get_user_base_id()
  )
);

-- Fonction de détection de livraison complète
CREATE OR REPLACE FUNCTION check_shipment_completion()
RETURNS TRIGGER AS $$
DECLARE
  total_boxes_count INTEGER;
  received_boxes_count INTEGER;
BEGIN
  -- Compter le nombre total de cartons dans la préparation
  SELECT COALESCE(total_boxes, 0) INTO total_boxes_count
  FROM shipment_preparations
  WHERE id = NEW.preparation_id;

  -- Compter le nombre de cartons distincts complètement réceptionnés
  SELECT COUNT(DISTINCT box_identifier) INTO received_boxes_count
  FROM shipment_receptions
  WHERE preparation_id = NEW.preparation_id
  AND status = 'complete';

  -- Si tous les cartons sont réceptionnés
  IF received_boxes_count >= total_boxes_count THEN
    UPDATE shipment_preparations
    SET 
      status = 'completed',
      actual_delivery_date = NOW(),
      received_boxes = received_boxes_count,
      received_items = (
        SELECT COALESCE(SUM(received_quantity), 0)
        FROM shipment_receptions
        WHERE preparation_id = NEW.preparation_id
      )
    WHERE id = NEW.preparation_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_check_shipment_completion ON shipment_receptions;
CREATE TRIGGER trigger_check_shipment_completion
AFTER INSERT OR UPDATE ON shipment_receptions
FOR EACH ROW
EXECUTE FUNCTION check_shipment_completion();