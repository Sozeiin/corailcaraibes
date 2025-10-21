-- Ajouter les colonnes de référence à planning_activities
ALTER TABLE planning_activities 
ADD COLUMN IF NOT EXISTS reference_type TEXT,
ADD COLUMN IF NOT EXISTS reference_id TEXT;

-- Créer l'index pour les recherches
CREATE INDEX IF NOT EXISTS idx_planning_activities_reference 
ON planning_activities(reference_type, reference_id);

-- Fonction pour créer automatiquement les activités de planning pour les check-ins
CREATE OR REPLACE FUNCTION public.create_checkin_planning_activity()
RETURNS TRIGGER AS $$
DECLARE
  boat_name TEXT;
  customer_name TEXT;
  checkin_title TEXT;
  checkout_title TEXT;
BEGIN
  -- Récupérer le nom du bateau
  SELECT name INTO boat_name FROM public.boats WHERE id = NEW.boat_id;
  
  -- Récupérer le nom du client
  SELECT CONCAT(first_name, ' ', last_name) INTO customer_name 
  FROM public.customers WHERE id = NEW.customer_id;
  
  -- Construire les titres
  checkin_title := 'Check-in: ' || COALESCE(customer_name, 'Client') || 
                   ' - ' || COALESCE(boat_name, 'Bateau');
  checkout_title := 'Check-out: ' || COALESCE(customer_name, 'Client') || 
                    ' - ' || COALESCE(boat_name, 'Bateau');
  
  -- Si la fiche passe à 'ready' et qu'il y a un bateau assigné
  IF NEW.status = 'ready' AND NEW.is_boat_assigned = true AND NEW.boat_id IS NOT NULL THEN
    -- Vérifier si une activité de check-in existe déjà
    IF NOT EXISTS (
      SELECT 1 FROM public.planning_activities 
      WHERE reference_type = 'checkin_form' 
      AND reference_id = NEW.id::text
      AND activity_type = 'checkin'
    ) THEN
      -- Créer l'activité de check-in
      INSERT INTO public.planning_activities (
        title,
        description,
        activity_type,
        status,
        scheduled_start,
        scheduled_end,
        base_id,
        boat_id,
        reference_type,
        reference_id,
        created_at,
        updated_at
      ) VALUES (
        checkin_title,
        COALESCE(NEW.rental_notes, '') || ' ' || COALESCE(NEW.special_instructions, ''),
        'checkin',
        'planned',
        NEW.planned_start_date,
        NEW.planned_start_date + INTERVAL '1 hour',
        NEW.base_id,
        NEW.boat_id,
        'checkin_form',
        NEW.id::text,
        NOW(),
        NOW()
      );
    END IF;
    
    -- Vérifier si une activité de check-out existe déjà
    IF NOT EXISTS (
      SELECT 1 FROM public.planning_activities 
      WHERE reference_type = 'checkin_form' 
      AND reference_id = NEW.id::text
      AND activity_type = 'checkout'
    ) THEN
      -- Créer l'activité de check-out
      INSERT INTO public.planning_activities (
        title,
        description,
        activity_type,
        status,
        scheduled_start,
        scheduled_end,
        base_id,
        boat_id,
        reference_type,
        reference_id,
        created_at,
        updated_at
      ) VALUES (
        checkout_title,
        'Fin de location - ' || COALESCE(NEW.rental_notes, ''),
        'checkout',
        'planned',
        NEW.planned_end_date - INTERVAL '1 hour',
        NEW.planned_end_date,
        NEW.base_id,
        NEW.boat_id,
        'checkin_form',
        NEW.id::text,
        NOW(),
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Créer le trigger pour la création automatique
DROP TRIGGER IF EXISTS trigger_create_checkin_planning ON public.administrative_checkin_forms;
CREATE TRIGGER trigger_create_checkin_planning
  AFTER INSERT OR UPDATE ON public.administrative_checkin_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.create_checkin_planning_activity();

-- Fonction pour synchroniser les suppressions et mises à jour
CREATE OR REPLACE FUNCTION public.sync_checkin_planning_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la fiche est annulée, n'est plus 'ready', ou est supprimée
  IF (TG_OP = 'UPDATE' AND OLD.status = 'ready' AND NEW.status != 'ready') OR TG_OP = 'DELETE' THEN
    DELETE FROM public.planning_activities 
    WHERE reference_type = 'checkin_form' 
    AND reference_id = COALESCE(NEW.id::text, OLD.id::text);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Créer le trigger de synchronisation
DROP TRIGGER IF EXISTS trigger_sync_checkin_planning ON public.administrative_checkin_forms;
CREATE TRIGGER trigger_sync_checkin_planning
  AFTER UPDATE OR DELETE ON public.administrative_checkin_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_checkin_planning_activity();

-- Migrer les fiches existantes (créer les activités manquantes)
INSERT INTO public.planning_activities (
  title,
  description,
  activity_type,
  status,
  scheduled_start,
  scheduled_end,
  base_id,
  boat_id,
  reference_type,
  reference_id,
  created_at,
  updated_at
)
SELECT 
  'Check-in: ' || COALESCE(c.first_name || ' ' || c.last_name, 'Client') || 
  ' - ' || COALESCE(b.name, 'Bateau') AS title,
  COALESCE(acf.rental_notes, '') || ' ' || COALESCE(acf.special_instructions, '') AS description,
  'checkin' AS activity_type,
  'planned' AS status,
  acf.planned_start_date AS scheduled_start,
  acf.planned_start_date + INTERVAL '1 hour' AS scheduled_end,
  acf.base_id,
  acf.boat_id,
  'checkin_form' AS reference_type,
  acf.id::text AS reference_id,
  NOW() AS created_at,
  NOW() AS updated_at
FROM public.administrative_checkin_forms acf
LEFT JOIN public.customers c ON c.id = acf.customer_id
LEFT JOIN public.boats b ON b.id = acf.boat_id
WHERE acf.status = 'ready' 
  AND acf.is_boat_assigned = true 
  AND acf.boat_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.planning_activities pa
    WHERE pa.reference_type = 'checkin_form' 
    AND pa.reference_id = acf.id::text
    AND pa.activity_type = 'checkin'
  );

-- Créer les activités de check-out pour les fiches existantes
INSERT INTO public.planning_activities (
  title,
  description,
  activity_type,
  status,
  scheduled_start,
  scheduled_end,
  base_id,
  boat_id,
  reference_type,
  reference_id,
  created_at,
  updated_at
)
SELECT 
  'Check-out: ' || COALESCE(c.first_name || ' ' || c.last_name, 'Client') || 
  ' - ' || COALESCE(b.name, 'Bateau') AS title,
  'Fin de location - ' || COALESCE(acf.rental_notes, '') AS description,
  'checkout' AS activity_type,
  'planned' AS status,
  acf.planned_end_date - INTERVAL '1 hour' AS scheduled_start,
  acf.planned_end_date AS scheduled_end,
  acf.base_id,
  acf.boat_id,
  'checkin_form' AS reference_type,
  acf.id::text AS reference_id,
  NOW() AS created_at,
  NOW() AS updated_at
FROM public.administrative_checkin_forms acf
LEFT JOIN public.customers c ON c.id = acf.customer_id
LEFT JOIN public.boats b ON b.id = acf.boat_id
WHERE acf.status = 'ready' 
  AND acf.is_boat_assigned = true 
  AND acf.boat_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.planning_activities pa
    WHERE pa.reference_type = 'checkin_form' 
    AND pa.reference_id = acf.id::text
    AND pa.activity_type = 'checkout'
  );