-- Create bulk purchase campaigns table
CREATE TABLE public.bulk_purchase_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  campaign_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  status TEXT NOT NULL DEFAULT 'draft', -- draft, collecting, quoting, analyzing, ordering, completed
  start_date DATE,
  end_date DATE,
  total_items INTEGER DEFAULT 0,
  total_estimated_value NUMERIC DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign items table
CREATE TABLE public.campaign_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'pièce',
  estimated_unit_price NUMERIC DEFAULT 0,
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  consolidation_status TEXT DEFAULT 'pending', -- pending, consolidated, split
  original_requests JSONB DEFAULT '[]'::jsonb, -- Store original requests from bases
  selected_supplier_id UUID,
  selected_quote_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create supplier quotes table
CREATE TABLE public.supplier_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_item_id UUID NOT NULL,
  supplier_id UUID NOT NULL,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  minimum_quantity INTEGER DEFAULT 1,
  delivery_time_days INTEGER,
  quality_rating INTEGER DEFAULT 5 CHECK (quality_rating >= 1 AND quality_rating <= 5),
  warranty_months INTEGER DEFAULT 0,
  quote_date DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  quote_reference TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending', -- pending, received, selected, rejected
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quote analysis table for comparative analysis
CREATE TABLE public.quote_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_item_id UUID NOT NULL,
  analysis_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  best_price_quote_id UUID,
  best_quality_quote_id UUID,
  best_value_quote_id UUID,
  recommendation TEXT,
  analysis_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign base distributions table
CREATE TABLE public.campaign_base_distributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_item_id UUID NOT NULL,
  base_id UUID NOT NULL,
  requested_quantity INTEGER NOT NULL DEFAULT 0,
  allocated_quantity INTEGER DEFAULT 0,
  priority TEXT DEFAULT 'medium',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.bulk_purchase_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_base_distributions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bulk_purchase_campaigns
CREATE POLICY "Direction can manage campaigns"
ON public.bulk_purchase_campaigns
FOR ALL
USING (get_user_role() = 'direction'::user_role);

CREATE POLICY "Chef de base can view campaigns"
ON public.bulk_purchase_campaigns
FOR SELECT
USING (get_user_role() = ANY(ARRAY['direction'::user_role, 'chef_base'::user_role]));

-- Create RLS policies for campaign_items
CREATE POLICY "Direction can manage campaign items"
ON public.campaign_items
FOR ALL
USING (get_user_role() = 'direction'::user_role);

CREATE POLICY "Chef de base can view campaign items"
ON public.campaign_items
FOR SELECT
USING (get_user_role() = ANY(ARRAY['direction'::user_role, 'chef_base'::user_role]));

-- Create RLS policies for supplier_quotes
CREATE POLICY "Direction can manage supplier quotes"
ON public.supplier_quotes
FOR ALL
USING (get_user_role() = 'direction'::user_role);

CREATE POLICY "Chef de base can view supplier quotes"
ON public.supplier_quotes
FOR SELECT
USING (get_user_role() = ANY(ARRAY['direction'::user_role, 'chef_base'::user_role]));

-- Create RLS policies for quote_analysis
CREATE POLICY "Direction can manage quote analysis"
ON public.quote_analysis
FOR ALL
USING (get_user_role() = 'direction'::user_role);

CREATE POLICY "Chef de base can view quote analysis"
ON public.quote_analysis
FOR SELECT
USING (get_user_role() = ANY(ARRAY['direction'::user_role, 'chef_base'::user_role]));

-- Create RLS policies for campaign_base_distributions
CREATE POLICY "Direction can manage campaign distributions"
ON public.campaign_base_distributions
FOR ALL
USING (get_user_role() = 'direction'::user_role);

CREATE POLICY "Chef de base can view their distributions"
ON public.campaign_base_distributions
FOR SELECT
USING (get_user_role() = 'direction'::user_role OR base_id = get_user_base_id());

-- Create indexes for better performance
CREATE INDEX idx_campaign_items_campaign_id ON public.campaign_items(campaign_id);
CREATE INDEX idx_supplier_quotes_campaign_item_id ON public.supplier_quotes(campaign_item_id);
CREATE INDEX idx_supplier_quotes_supplier_id ON public.supplier_quotes(supplier_id);
CREATE INDEX idx_quote_analysis_campaign_item_id ON public.quote_analysis(campaign_item_id);
CREATE INDEX idx_campaign_base_distributions_campaign_item_id ON public.campaign_base_distributions(campaign_item_id);
CREATE INDEX idx_campaign_base_distributions_base_id ON public.campaign_base_distributions(base_id);

-- Create trigger for updating updated_at columns
CREATE TRIGGER update_bulk_purchase_campaigns_updated_at
  BEFORE UPDATE ON public.bulk_purchase_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_items_updated_at
  BEFORE UPDATE ON public.campaign_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_supplier_quotes_updated_at
  BEFORE UPDATE ON public.supplier_quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quote_analysis_updated_at
  BEFORE UPDATE ON public.quote_analysis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_base_distributions_updated_at
  BEFORE UPDATE ON public.campaign_base_distributions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();