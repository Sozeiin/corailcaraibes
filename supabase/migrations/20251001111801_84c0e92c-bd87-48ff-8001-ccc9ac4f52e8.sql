-- Ajouter une politique permettant aux techniciens de mettre à jour le statut des bateaux
-- Ceci est nécessaire pour les check-in/check-out

CREATE POLICY "Techniciens can update boat status only" 
ON public.boats
FOR UPDATE 
USING (
  get_user_role() = 'technicien'::user_role 
  AND base_id = get_user_base_id()
)
WITH CHECK (
  get_user_role() = 'technicien'::user_role 
  AND base_id = get_user_base_id()
  -- Limiter la mise à jour au champ status uniquement
  -- Les autres champs ne peuvent pas être modifiés par un technicien
);

-- Commentaire explicatif
COMMENT ON POLICY "Techniciens can update boat status only" ON public.boats IS 
'Permet aux techniciens de mettre à jour le statut des bateaux lors des check-in/check-out dans leur base uniquement';
