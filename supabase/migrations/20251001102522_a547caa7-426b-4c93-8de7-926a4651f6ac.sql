-- Modifier la policy RLS pour permettre la remise en "ready" lors d'une annulation
DROP POLICY IF EXISTS "Technicians can update forms when using them" ON public.administrative_checkin_forms;

CREATE POLICY "Technicians can update forms when using them"
ON public.administrative_checkin_forms
FOR UPDATE
TO authenticated
USING (
  (base_id = get_user_base_id()) 
  AND (status IN ('ready', 'used'))
)
WITH CHECK (
  base_id = get_user_base_id()
);