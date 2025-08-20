-- Phase 3: Créer les tables pour les fonctionnalités avancées des fournisseurs

-- Table pour les évaluations des fournisseurs
CREATE TABLE IF NOT EXISTS public.supplier_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL,
  evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quality_score INTEGER NOT NULL CHECK (quality_score >= 1 AND quality_score <= 5),
  delivery_score INTEGER NOT NULL CHECK (delivery_score >= 1 AND delivery_score <= 5),
  price_score INTEGER NOT NULL CHECK (price_score >= 1 AND price_score <= 5),
  service_score INTEGER NOT NULL CHECK (service_score >= 1 AND service_score <= 5),
  overall_score NUMERIC GENERATED ALWAYS AS ((quality_score + delivery_score + price_score + service_score) / 4.0) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table pour les interactions avec les fournisseurs (CRM)
CREATE TABLE IF NOT EXISTS public.supplier_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('call', 'email', 'meeting', 'negotiation', 'complaint', 'other')),
  interaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  subject TEXT NOT NULL,
  description TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table pour les documents des fournisseurs
CREATE TABLE IF NOT EXISTS public.supplier_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('contract', 'certificate', 'insurance', 'catalog', 'other')),
  document_name TEXT NOT NULL,
  document_url TEXT,
  expiry_date DATE,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Table pour les contrats fournisseurs
CREATE TABLE IF NOT EXISTS public.supplier_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  contract_number TEXT UNIQUE NOT NULL,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('framework', 'exclusive', 'preferred', 'standard')),
  start_date DATE NOT NULL,
  end_date DATE,
  negotiated_discount NUMERIC DEFAULT 0,
  payment_terms INTEGER DEFAULT 30,
  minimum_order_amount NUMERIC DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes pour la performance
CREATE INDEX IF NOT EXISTS idx_supplier_evaluations_supplier_id ON public.supplier_evaluations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_evaluations_date ON public.supplier_evaluations(evaluation_date);
CREATE INDEX IF NOT EXISTS idx_supplier_interactions_supplier_id ON public.supplier_interactions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_interactions_date ON public.supplier_interactions(interaction_date);
CREATE INDEX IF NOT EXISTS idx_supplier_documents_supplier_id ON public.supplier_documents(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_contracts_supplier_id ON public.supplier_contracts(supplier_id);

-- Politiques RLS pour les nouvelles tables
ALTER TABLE public.supplier_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_contracts ENABLE ROW LEVEL SECURITY;

-- Politiques pour supplier_evaluations
CREATE POLICY "Direction and chef_base can manage supplier evaluations" ON public.supplier_evaluations
  FOR ALL USING (
    get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role])
  );

CREATE POLICY "Users can view supplier evaluations" ON public.supplier_evaluations
  FOR SELECT USING (
    get_user_role() = 'direction'::user_role OR
    EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_evaluations.supplier_id AND (s.base_id = get_user_base_id() OR s.base_id IS NULL))
  );

-- Politiques pour supplier_interactions
CREATE POLICY "Direction and chef_base can manage supplier interactions" ON public.supplier_interactions
  FOR ALL USING (
    get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role])
  );

CREATE POLICY "Users can view supplier interactions" ON public.supplier_interactions
  FOR SELECT USING (
    get_user_role() = 'direction'::user_role OR
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_interactions.supplier_id AND (s.base_id = get_user_base_id() OR s.base_id IS NULL))
  );

-- Politiques pour supplier_documents
CREATE POLICY "Direction and chef_base can manage supplier documents" ON public.supplier_documents
  FOR ALL USING (
    get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role])
  );

CREATE POLICY "Users can view supplier documents" ON public.supplier_documents
  FOR SELECT USING (
    get_user_role() = 'direction'::user_role OR
    EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_documents.supplier_id AND (s.base_id = get_user_base_id() OR s.base_id IS NULL))
  );

-- Politiques pour supplier_contracts
CREATE POLICY "Direction and chef_base can manage supplier contracts" ON public.supplier_contracts
  FOR ALL USING (
    get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role])
  );

CREATE POLICY "Users can view supplier contracts" ON public.supplier_contracts
  FOR SELECT USING (
    get_user_role() = 'direction'::user_role OR
    EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_contracts.supplier_id AND (s.base_id = get_user_base_id() OR s.base_id IS NULL))
  );

-- Triggers pour updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_supplier_evaluations_updated_at 
  BEFORE UPDATE ON public.supplier_evaluations 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_supplier_contracts_updated_at 
  BEFORE UPDATE ON public.supplier_contracts 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();