-- Fix RLS policies for check-in/check-out functionality

-- Drop existing restrictive policies for boat_rentals
DROP POLICY IF EXISTS "Users can manage boat rentals in their base" ON public.boat_rentals;
DROP POLICY IF EXISTS "Users can view boat rentals" ON public.boat_rentals;

-- Create more permissive policies for boat_rentals that allow check-in/check-out operations
CREATE POLICY "Users can manage boat rentals"
ON public.boat_rentals
FOR ALL
USING (
  (get_user_role() = 'direction'::user_role) OR 
  (base_id = get_user_base_id()) OR
  (EXISTS (
    SELECT 1 FROM boats b 
    WHERE b.id = boat_rentals.boat_id 
    AND b.base_id = get_user_base_id()
  ))
)
WITH CHECK (
  (get_user_role() = 'direction'::user_role) OR 
  (base_id = get_user_base_id()) OR
  (EXISTS (
    SELECT 1 FROM boats b 
    WHERE b.id = boat_rentals.boat_id 
    AND b.base_id = get_user_base_id()
  ))
);

-- Drop existing restrictive policies for boat_checklists  
DROP POLICY IF EXISTS "Users can manage boat checklists" ON public.boat_checklists;
DROP POLICY IF EXISTS "Users can view boat checklists" ON public.boat_checklists;

-- Create more permissive policies for boat_checklists
CREATE POLICY "Users can manage boat checklists"
ON public.boat_checklists
FOR ALL
USING (
  (get_user_role() = 'direction'::user_role) OR
  (technician_id = auth.uid()) OR
  (EXISTS (
    SELECT 1 FROM boats b 
    WHERE b.id = boat_checklists.boat_id 
    AND b.base_id = get_user_base_id()
  ))
)
WITH CHECK (
  (get_user_role() = 'direction'::user_role) OR
  (technician_id = auth.uid()) OR
  (EXISTS (
    SELECT 1 FROM boats b 
    WHERE b.id = boat_checklists.boat_id 
    AND b.base_id = get_user_base_id()
  ))
);

-- Drop existing restrictive policies for boat_checklist_items
DROP POLICY IF EXISTS "Users can manage boat checklist items" ON public.boat_checklist_items;
DROP POLICY IF EXISTS "Users can view boat checklist items" ON public.boat_checklist_items;

-- Create more permissive policies for boat_checklist_items
CREATE POLICY "Users can manage boat checklist items"
ON public.boat_checklist_items
FOR ALL
USING (
  (get_user_role() = 'direction'::user_role) OR
  (EXISTS (
    SELECT 1 FROM boat_checklists bc
    JOIN boats b ON b.id = bc.boat_id
    WHERE bc.id = boat_checklist_items.checklist_id 
    AND (
      bc.technician_id = auth.uid() OR
      b.base_id = get_user_base_id()
    )
  ))
)
WITH CHECK (
  (get_user_role() = 'direction'::user_role) OR
  (EXISTS (
    SELECT 1 FROM boat_checklists bc
    JOIN boats b ON b.id = bc.boat_id
    WHERE bc.id = boat_checklist_items.checklist_id 
    AND (
      bc.technician_id = auth.uid() OR
      b.base_id = get_user_base_id()
    )
  ))
);