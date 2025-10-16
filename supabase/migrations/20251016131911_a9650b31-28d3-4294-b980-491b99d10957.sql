-- Supprimer la politique de suppression restrictive actuelle
DROP POLICY IF EXISTS "Chef_base and administratif can delete own customers" ON public.customers;

-- Créer une nouvelle politique de suppression élargie
CREATE POLICY "Direction, chef_base and administratif can delete all customers"
  ON public.customers
  FOR DELETE
  USING (
    get_user_role() IN ('direction'::user_role, 'chef_base'::user_role, 'administratif'::user_role)
  );