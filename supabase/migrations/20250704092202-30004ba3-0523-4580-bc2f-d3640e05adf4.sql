-- Fonction pour calculer la prochaine date de maintenance
CREATE OR REPLACE FUNCTION public.calculate_next_maintenance_date(
  last_date DATE,
  interval_value INTEGER,
  interval_unit TEXT
) RETURNS DATE AS $$
BEGIN
  CASE interval_unit
    WHEN 'heures' THEN RETURN last_date + (interval_value * INTERVAL '1 hour')::DATE;
    WHEN 'jours' THEN RETURN last_date + (interval_value * INTERVAL '1 day');
    WHEN 'semaines' THEN RETURN last_date + (interval_value * INTERVAL '1 week');
    WHEN 'mois' THEN RETURN last_date + (interval_value * INTERVAL '1 month');
    WHEN 'années' THEN RETURN last_date + (interval_value * INTERVAL '1 year');
    ELSE RETURN last_date + (interval_value * INTERVAL '1 month');
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer automatiquement les maintenances planifiées
CREATE OR REPLACE FUNCTION public.create_scheduled_maintenance_from_manual()
RETURNS TRIGGER AS $$
DECLARE
  task_record RECORD;
  next_date DATE;
BEGIN
  -- Pour chaque tâche du manuel, créer une maintenance planifiée
  FOR task_record IN 
    SELECT * FROM maintenance_manual_tasks WHERE manual_id = NEW.id
  LOOP
    -- Calculer la prochaine date de maintenance (à partir d'aujourd'hui)
    next_date := calculate_next_maintenance_date(CURRENT_DATE, task_record.interval_value, task_record.interval_unit);
    
    -- Créer la maintenance planifiée
    INSERT INTO scheduled_maintenance (
      boat_id,
      manual_task_id,
      task_name,
      scheduled_date
    ) VALUES (
      NEW.boat_id,
      task_record.id,
      task_record.task_name,
      next_date
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour créer automatiquement les maintenances planifiées quand un manuel est créé
CREATE TRIGGER create_scheduled_maintenance_on_manual_creation
AFTER INSERT ON public.maintenance_manuals
FOR EACH ROW
WHEN (NEW.boat_id IS NOT NULL AND NEW.is_active = true)
EXECUTE FUNCTION public.create_scheduled_maintenance_from_manual();