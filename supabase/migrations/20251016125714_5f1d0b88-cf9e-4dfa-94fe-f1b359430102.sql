-- ============================================================================
-- Plan 3 : Base clients complète + Pool de fiches
-- ============================================================================

-- 1. Créer la table customers (base de données centralisée)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_id UUID NOT NULL REFERENCES public.bases(id) ON DELETE CASCADE,
  
  -- Informations personnelles
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Martinique',
  
  -- Informations supplémentaires
  customer_type TEXT DEFAULT 'individual', -- individual, company
  company_name TEXT,
  id_number TEXT, -- Numéro de pièce d'identité
  id_type TEXT, -- passport, driver_license, id_card
  
  -- Métadonnées
  notes TEXT,
  vip_status BOOLEAN DEFAULT false,
  preferred_language TEXT DEFAULT 'fr',
  
  -- Statistiques automatiques
  total_rentals INTEGER DEFAULT 0,
  last_rental_date DATE,
  first_rental_date DATE,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_customers_base ON public.customers(base_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(base_id, email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(base_id, phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(base_id, first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_customers_vip ON public.customers(base_id, vip_status) WHERE vip_status = true;

-- 2. Mise à jour de administrative_checkin_forms pour Plan 3
ALTER TABLE public.administrative_checkin_forms
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_boat_assigned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS suggested_boat_id UUID REFERENCES public.boats(id) ON DELETE SET NULL;

-- boat_id devient nullable (Plan 3 - Pool de fiches)
ALTER TABLE public.administrative_checkin_forms
ALTER COLUMN boat_id DROP NOT NULL;

-- Index pour le pool de fiches
CREATE INDEX IF NOT EXISTS idx_admin_forms_customer ON public.administrative_checkin_forms(customer_id);
CREATE INDEX IF NOT EXISTS idx_admin_forms_unassigned ON public.administrative_checkin_forms(base_id, is_boat_assigned, planned_start_date) 
  WHERE is_boat_assigned = false;

-- 3. Ajouter customer_id à boat_rentals
ALTER TABLE public.boat_rentals
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rentals_customer ON public.boat_rentals(customer_id, start_date DESC);

-- 4. Trigger automatique pour mettre à jour les statistiques clients
CREATE OR REPLACE FUNCTION public.update_customer_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.customer_id IS NOT NULL THEN
    UPDATE public.customers
    SET 
      total_rentals = total_rentals + 1,
      last_rental_date = NEW.start_date,
      first_rental_date = COALESCE(first_rental_date, NEW.start_date)
    WHERE id = NEW.customer_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.customer_id IS DISTINCT FROM OLD.customer_id THEN
    -- Décrémenter l'ancien client si changement
    IF OLD.customer_id IS NOT NULL THEN
      UPDATE public.customers
      SET total_rentals = GREATEST(total_rentals - 1, 0)
      WHERE id = OLD.customer_id;
    END IF;
    -- Incrémenter le nouveau client
    IF NEW.customer_id IS NOT NULL THEN
      UPDATE public.customers
      SET 
        total_rentals = total_rentals + 1,
        last_rental_date = NEW.start_date,
        first_rental_date = COALESCE(first_rental_date, NEW.start_date)
      WHERE id = NEW.customer_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_customer_stats ON public.boat_rentals;
CREATE TRIGGER trigger_update_customer_stats
AFTER INSERT OR UPDATE OF customer_id ON public.boat_rentals
FOR EACH ROW
EXECUTE FUNCTION public.update_customer_stats();

-- 5. Trigger pour mettre à jour updated_at sur customers
CREATE OR REPLACE FUNCTION public.update_customer_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_customer_updated_at ON public.customers;
CREATE TRIGGER trigger_customer_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_customer_updated_at();

-- 6. RLS pour la table customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Direction peut tout faire
DROP POLICY IF EXISTS "Direction can manage all customers" ON public.customers;
CREATE POLICY "Direction can manage all customers"
  ON public.customers
  FOR ALL
  USING (has_role(auth.uid(), 'direction'::app_role))
  WITH CHECK (has_role(auth.uid(), 'direction'::app_role));

-- Chef_base et administratif peuvent gérer les clients de leur base
DROP POLICY IF EXISTS "Chef_base and administratif can manage customers in their base" ON public.customers;
CREATE POLICY "Chef_base and administratif can manage customers in their base"
  ON public.customers
  FOR ALL
  USING (
    (has_role(auth.uid(), 'chef_base'::app_role) OR has_role(auth.uid(), 'administratif'::app_role))
    AND base_id = get_user_base_id()
  )
  WITH CHECK (
    (has_role(auth.uid(), 'chef_base'::app_role) OR has_role(auth.uid(), 'administratif'::app_role))
    AND base_id = get_user_base_id()
  );

-- Techniciens peuvent voir les clients de leur base
DROP POLICY IF EXISTS "Technicians can view customers in their base" ON public.customers;
CREATE POLICY "Technicians can view customers in their base"
  ON public.customers
  FOR SELECT
  USING (
    has_role(auth.uid(), 'technicien'::app_role)
    AND base_id = get_user_base_id()
  );

-- 7. Migration des données existantes
-- Créer des clients depuis les fiches administratives existantes
INSERT INTO public.customers (
  base_id,
  first_name,
  last_name,
  email,
  phone,
  address,
  id_number,
  created_at,
  created_by
)
SELECT DISTINCT ON (f.base_id, LOWER(TRIM(COALESCE(f.customer_email, ''))), LOWER(TRIM(COALESCE(f.customer_phone, ''))))
  f.base_id,
  COALESCE(split_part(f.customer_name, ' ', 1), 'Client') as first_name,
  COALESCE(NULLIF(substring(f.customer_name from position(' ' in f.customer_name) + 1), ''), '') as last_name,
  LOWER(TRIM(f.customer_email)) as email,
  TRIM(f.customer_phone) as phone,
  f.customer_address,
  f.customer_id_number,
  f.created_at,
  f.created_by
FROM public.administrative_checkin_forms f
WHERE f.customer_name IS NOT NULL
  AND f.customer_name != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.customers c 
    WHERE c.base_id = f.base_id
    AND (
      (c.email IS NOT NULL AND c.email = LOWER(TRIM(f.customer_email)))
      OR (c.phone IS NOT NULL AND c.phone = TRIM(f.customer_phone))
    )
  )
ON CONFLICT DO NOTHING;

-- Lier les fiches existantes aux clients créés
UPDATE public.administrative_checkin_forms f
SET 
  customer_id = c.id,
  is_boat_assigned = CASE WHEN f.boat_id IS NOT NULL THEN true ELSE false END,
  suggested_boat_id = f.boat_id
FROM public.customers c
WHERE f.customer_id IS NULL
  AND f.base_id = c.base_id
  AND (
    (f.customer_email IS NOT NULL AND LOWER(TRIM(f.customer_email)) = c.email)
    OR (f.customer_phone IS NOT NULL AND TRIM(f.customer_phone) = c.phone)
  );

-- Lier les locations existantes aux clients
UPDATE public.boat_rentals r
SET customer_id = c.id
FROM public.customers c
WHERE r.customer_id IS NULL
  AND (
    (r.customer_email IS NOT NULL AND LOWER(TRIM(r.customer_email)) = c.email)
    OR (r.customer_phone IS NOT NULL AND TRIM(r.customer_phone) = c.phone)
  );

COMMENT ON TABLE public.customers IS 'Base de données centralisée des clients pour éviter les doublons et faciliter la gestion';
COMMENT ON COLUMN public.customers.total_rentals IS 'Nombre total de locations (mis à jour automatiquement par trigger)';
COMMENT ON COLUMN public.administrative_checkin_forms.is_boat_assigned IS 'true = fiche avec bateau assigné (ready), false = fiche dans le pool';
COMMENT ON COLUMN public.administrative_checkin_forms.suggested_boat_id IS 'Bateau suggéré par l''administratif (peut être différent du bateau final)';