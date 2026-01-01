-- Fix FK blocking user deletion: boat_checklists.technician_id -> profiles.id
-- Make it nullable on delete so profiles can be removed safely
ALTER TABLE public.boat_checklists
  DROP CONSTRAINT IF EXISTS boat_checklists_technician_id_fkey;

ALTER TABLE public.boat_checklists
  ADD CONSTRAINT boat_checklists_technician_id_fkey
  FOREIGN KEY (technician_id)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;