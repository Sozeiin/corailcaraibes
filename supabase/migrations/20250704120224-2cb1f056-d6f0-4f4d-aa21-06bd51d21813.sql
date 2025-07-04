-- Mise à jour des politiques RLS pour boat_rentals
-- Permettre aux techniciens de créer et gérer les locations

-- Supprimer l'ancienne politique
DROP POLICY IF EXISTS "Direction and chef_base can manage boat rentals" ON public.boat_rentals;

-- Créer une nouvelle politique qui inclut les techniciens
CREATE POLICY "Users can manage boat rentals in their base" 
ON public.boat_rentals 
FOR ALL 
USING (
  get_user_role() = ANY(ARRAY['direction'::user_role, 'chef_base'::user_role, 'technicien'::user_role]) AND
  (get_user_role() = 'direction'::user_role OR base_id = get_user_base_id())
);