-- Mise à jour des politiques RLS pour permettre le partage inter-bases des clients

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Chef_base and administratif can manage customers in their base" ON public.customers;
DROP POLICY IF EXISTS "Technicians can view customers in their base" ON public.customers;

-- Nouvelle politique : Tous les rôles peuvent VOIR tous les clients (toutes bases)
CREATE POLICY "Chef_base and administratif can view all customers"
  ON public.customers
  FOR SELECT
  USING (
    has_role(auth.uid(), 'chef_base'::app_role) OR 
    has_role(auth.uid(), 'administratif'::app_role) OR
    has_role(auth.uid(), 'technicien'::app_role)
  );

-- Nouvelle politique : Chef_base et Administratif peuvent MODIFIER uniquement les clients de leur base
CREATE POLICY "Chef_base and administratif can manage own base customers"
  ON public.customers
  FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'chef_base'::app_role) OR has_role(auth.uid(), 'administratif'::app_role))
    AND base_id = get_user_base_id()
  );

CREATE POLICY "Chef_base and administratif can update own base customers"
  ON public.customers
  FOR UPDATE
  USING (
    (has_role(auth.uid(), 'chef_base'::app_role) OR has_role(auth.uid(), 'administratif'::app_role))
    AND base_id = get_user_base_id()
  )
  WITH CHECK (
    (has_role(auth.uid(), 'chef_base'::app_role) OR has_role(auth.uid(), 'administratif'::app_role))
    AND base_id = get_user_base_id()
  );

CREATE POLICY "Chef_base and administratif can delete own base customers"
  ON public.customers
  FOR DELETE
  USING (
    (has_role(auth.uid(), 'chef_base'::app_role) OR has_role(auth.uid(), 'administratif'::app_role))
    AND base_id = get_user_base_id()
  );