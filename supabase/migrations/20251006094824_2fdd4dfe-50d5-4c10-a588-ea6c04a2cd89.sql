-- Phase 1c: Nettoyer et recréer proprement la structure tenant

-- 1. Supprimer les policies existantes
DROP POLICY IF EXISTS "Super admins can manage all tenants" ON public.tenants;
DROP POLICY IF EXISTS "Direction can view all tenants" ON public.tenants;

-- 2. Supprimer la table tenants si elle existe
DROP TABLE IF EXISTS public.tenants CASCADE;

-- 3. Recréer la table tenants
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  country TEXT NOT NULL DEFAULT 'Guadeloupe',
  contact_email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Activer RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 5. Créer les policies
CREATE POLICY "Super admins can manage all tenants"
  ON public.tenants
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Direction can view all tenants"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'direction'::app_role));

-- 6. Créer le tenant par défaut
INSERT INTO public.tenants (company_name, slug, country, contact_email, is_active)
VALUES ('Corail Caraïbes', 'corail-caraibes', 'Guadeloupe', 'contact@corailcaraibes.com', true);

-- 7. Ajouter tenant_id aux tables
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- 8. Assigner tous les utilisateurs existants au tenant "Corail Caraïbes"
UPDATE public.user_roles
SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'corail-caraibes')
WHERE tenant_id IS NULL;

UPDATE public.profiles
SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'corail-caraibes')
WHERE tenant_id IS NULL;

-- 9. Créer la fonction get_user_tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 10. Créer les index
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON public.user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);

-- 11. Trigger pour updated_at
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();