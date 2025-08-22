-- Fix foreign key constraint names for boat_safety_controls table
ALTER TABLE public.boat_safety_controls 
DROP CONSTRAINT IF EXISTS boat_safety_controls_category_id_fkey,
ADD CONSTRAINT boat_safety_controls_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES public.safety_control_categories(id);

-- Ensure performed_by and validated_by foreign keys exist
ALTER TABLE public.boat_safety_controls 
DROP CONSTRAINT IF EXISTS boat_safety_controls_performed_by_fkey,
ADD CONSTRAINT boat_safety_controls_performed_by_fkey 
  FOREIGN KEY (performed_by) REFERENCES public.profiles(id);

ALTER TABLE public.boat_safety_controls 
DROP CONSTRAINT IF EXISTS boat_safety_controls_validated_by_fkey,
ADD CONSTRAINT boat_safety_controls_validated_by_fkey 
  FOREIGN KEY (validated_by) REFERENCES public.profiles(id);