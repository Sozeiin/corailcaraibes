-- Correction des politiques RLS pour le partage inter-bases des clients

-- Supprimer toutes les politiques existantes pour repartir sur une base saine
DROP POLICY IF EXISTS "Direction can manage all customers" ON public.customers;
DROP POLICY IF EXISTS "Chef_base and administratif can view all customers" ON public.customers;
DROP POLICY IF EXISTS "Chef_base and administratif can manage own base customers" ON public.customers;
DROP POLICY IF EXISTS "Chef_base and administratif can update own base customers" ON public.customers;
DROP POLICY IF EXISTS "Chef_base and administratif can delete own base customers" ON public.customers;

-- Politique Direction : Contrôle total sur tous les clients
CREATE POLICY "Direction can manage all customers"
  ON public.customers
  FOR ALL
  USING (has_role(auth.uid(), 'direction'::app_role))
  WITH CHECK (has_role(auth.uid(), 'direction'::app_role));

-- Politique LECTURE : Tous les rôles peuvent VOIR tous les clients (toutes bases)
CREATE POLICY "All roles can view all customers"
  ON public.customers
  FOR SELECT
  USING (
    has_role(auth.uid(), 'direction'::app_role) OR
    has_role(auth.uid(), 'chef_base'::app_role) OR 
    has_role(auth.uid(), 'administratif'::app_role) OR
    has_role(auth.uid(), 'technicien'::app_role)
  );

-- Politique INSERT : Chef_base et Administratif peuvent CRÉER dans leur base
CREATE POLICY "Chef_base and administratif can create customers in their base"
  ON public.customers
  FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'chef_base'::app_role) OR has_role(auth.uid(), 'administratif'::app_role))
    AND base_id = get_user_base_id()
  );

-- Politique UPDATE : Chef_base et Administratif peuvent MODIFIER uniquement leurs clients
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

-- Politique DELETE : Chef_base et Administratif peuvent SUPPRIMER uniquement leurs clients
CREATE POLICY "Chef_base and administratif can delete own base customers"
  ON public.customers
  FOR DELETE
  USING (
    (has_role(auth.uid(), 'chef_base'::app_role) OR has_role(auth.uid(), 'administratif'::app_role))
    AND base_id = get_user_base_id()
  );