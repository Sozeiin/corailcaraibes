-- Modifier les politiques RLS pour utiliser get_user_role() au lieu de has_role()

-- Supprimer TOUTES les politiques existantes sur customers
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'customers' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.customers', r.policyname);
    END LOOP;
END $$;

-- Politique Direction : Contrôle total sur tous les clients
CREATE POLICY "Direction can manage all customers"
  ON public.customers
  FOR ALL
  USING (get_user_role() = 'direction'::user_role)
  WITH CHECK (get_user_role() = 'direction'::user_role);

-- Politique LECTURE : Tous les rôles peuvent VOIR tous les clients (toutes bases)
CREATE POLICY "All roles can view all customers"
  ON public.customers
  FOR SELECT
  USING (
    get_user_role() IN ('direction'::user_role, 'chef_base'::user_role, 'administratif'::user_role, 'technicien'::user_role)
  );

-- Politique INSERT : Chef_base et Administratif peuvent CRÉER dans leur base
CREATE POLICY "Chef_base and administratif can create customers"
  ON public.customers
  FOR INSERT
  WITH CHECK (
    get_user_role() IN ('chef_base'::user_role, 'administratif'::user_role)
    AND base_id = get_user_base_id()
  );

-- Politique UPDATE : Chef_base et Administratif peuvent MODIFIER uniquement leurs clients
CREATE POLICY "Chef_base and administratif can update own customers"
  ON public.customers
  FOR UPDATE
  USING (
    get_user_role() IN ('chef_base'::user_role, 'administratif'::user_role)
    AND base_id = get_user_base_id()
  )
  WITH CHECK (
    get_user_role() IN ('chef_base'::user_role, 'administratif'::user_role)
    AND base_id = get_user_base_id()
  );

-- Politique DELETE : Chef_base et Administratif peuvent SUPPRIMER uniquement leurs clients
CREATE POLICY "Chef_base and administratif can delete own customers"
  ON public.customers
  FOR DELETE
  USING (
    get_user_role() IN ('chef_base'::user_role, 'administratif'::user_role)
    AND base_id = get_user_base_id()
  );