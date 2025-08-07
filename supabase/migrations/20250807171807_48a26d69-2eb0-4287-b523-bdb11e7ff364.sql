-- Add reference column to boat_components table
ALTER TABLE public.boat_components 
ADD COLUMN reference TEXT;

-- Add reference column to boat_sub_components table  
ALTER TABLE public.boat_sub_components 
ADD COLUMN reference TEXT;

-- Update the trigger function to include reference when creating stock items
CREATE OR REPLACE FUNCTION public.create_stock_item_from_component()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Create stock item for new boat component
  IF TG_TABLE_NAME = 'boat_components' THEN
    INSERT INTO public.stock_items (
      name,
      reference,
      category,
      quantity,
      min_threshold,
      unit,
      location,
      base_id,
      last_updated
    )
    SELECT 
      NEW.component_name,
      COALESCE(NEW.reference, 'COMP-' || SUBSTRING(NEW.id::text, 1, 8)),
      NEW.component_type,
      1,
      1,
      'pièce',
      'Composant bateau - ' || b.name,
      b.base_id,
      NOW()
    FROM boats b 
    WHERE b.id = NEW.boat_id
    ON CONFLICT (name, base_id) DO NOTHING;
    
  -- Create stock item for new sub-component
  ELSIF TG_TABLE_NAME = 'boat_sub_components' THEN
    INSERT INTO public.stock_items (
      name,
      reference,
      category,
      quantity,
      min_threshold,
      unit,
      location,
      base_id,
      last_updated
    )
    SELECT 
      NEW.sub_component_name,
      COALESCE(NEW.reference, 'SUB-' || SUBSTRING(NEW.id::text, 1, 8)),
      COALESCE(NEW.sub_component_type, 'Sous-composant'),
      1,
      1,
      'pièce',
      'Sous-composant - ' || bc.component_name,
      b.base_id,
      NOW()
    FROM boat_components bc
    JOIN boats b ON b.id = bc.boat_id
    WHERE bc.id = NEW.parent_component_id
    ON CONFLICT (name, base_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;