-- Create table for boat sub-components
CREATE TABLE public.boat_sub_components (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_component_id UUID NOT NULL REFERENCES public.boat_components(id) ON DELETE CASCADE,
  sub_component_name TEXT NOT NULL,
  sub_component_type TEXT,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  installation_date DATE,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  maintenance_interval_days INTEGER DEFAULT 365,
  status TEXT DEFAULT 'operational',
  position_in_component TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for linking components to stock items
CREATE TABLE public.component_stock_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  component_id UUID REFERENCES public.boat_components(id) ON DELETE CASCADE,
  sub_component_id UUID REFERENCES public.boat_sub_components(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  quantity_required INTEGER DEFAULT 1,
  replacement_priority TEXT DEFAULT 'medium',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_component_or_sub_component CHECK (
    (component_id IS NOT NULL AND sub_component_id IS NULL) OR
    (component_id IS NULL AND sub_component_id IS NOT NULL)
  )
);

-- Create table for component purchase history
CREATE TABLE public.component_purchase_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  component_id UUID REFERENCES public.boat_components(id) ON DELETE CASCADE,
  sub_component_id UUID REFERENCES public.boat_sub_components(id) ON DELETE CASCADE,
  stock_item_id UUID REFERENCES public.stock_items(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  order_id UUID REFERENCES public.orders(id),
  purchase_date DATE NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_cost DECIMAL(10,2) GENERATED ALWAYS AS (unit_cost * quantity) STORED,
  warranty_months INTEGER DEFAULT 0,
  invoice_reference TEXT,
  installation_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_component_or_sub_component_purchase CHECK (
    (component_id IS NOT NULL AND sub_component_id IS NULL) OR
    (component_id IS NULL AND sub_component_id IS NOT NULL)
  )
);

-- Create table for component supplier references
CREATE TABLE public.component_supplier_references (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  component_id UUID REFERENCES public.boat_components(id) ON DELETE CASCADE,
  sub_component_id UUID REFERENCES public.boat_sub_components(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  supplier_part_number TEXT,
  catalog_reference TEXT,
  last_quoted_price DECIMAL(10,2),
  last_quote_date DATE,
  lead_time_days INTEGER,
  minimum_order_quantity INTEGER DEFAULT 1,
  preferred_supplier BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_component_or_sub_component_supplier CHECK (
    (component_id IS NOT NULL AND sub_component_id IS NULL) OR
    (component_id IS NULL AND sub_component_id IS NOT NULL)
  )
);

-- Enable RLS on new tables
ALTER TABLE public.boat_sub_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.component_stock_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.component_purchase_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.component_supplier_references ENABLE ROW LEVEL SECURITY;

-- RLS policies for boat_sub_components
CREATE POLICY "Direction and chef_base can manage boat sub-components"
ON public.boat_sub_components
FOR ALL
USING (
  get_user_role() = ANY(ARRAY['direction'::user_role, 'chef_base'::user_role]) AND
  (get_user_role() = 'direction'::user_role OR EXISTS (
    SELECT 1 FROM public.boat_components bc
    JOIN public.boats b ON b.id = bc.boat_id
    WHERE bc.id = boat_sub_components.parent_component_id AND b.base_id = get_user_base_id()
  ))
);

CREATE POLICY "Users can view boat sub-components for their base"
ON public.boat_sub_components
FOR SELECT
USING (
  get_user_role() = 'direction'::user_role OR EXISTS (
    SELECT 1 FROM public.boat_components bc
    JOIN public.boats b ON b.id = bc.boat_id
    WHERE bc.id = boat_sub_components.parent_component_id AND b.base_id = get_user_base_id()
  )
);

-- RLS policies for component_stock_links
CREATE POLICY "Direction and chef_base can manage component stock links"
ON public.component_stock_links
FOR ALL
USING (
  get_user_role() = ANY(ARRAY['direction'::user_role, 'chef_base'::user_role]) AND
  (get_user_role() = 'direction'::user_role OR 
   (component_id IS NOT NULL AND EXISTS (
     SELECT 1 FROM public.boat_components bc
     JOIN public.boats b ON b.id = bc.boat_id
     WHERE bc.id = component_stock_links.component_id AND b.base_id = get_user_base_id()
   )) OR
   (sub_component_id IS NOT NULL AND EXISTS (
     SELECT 1 FROM public.boat_sub_components bsc
     JOIN public.boat_components bc ON bc.id = bsc.parent_component_id
     JOIN public.boats b ON b.id = bc.boat_id
     WHERE bsc.id = component_stock_links.sub_component_id AND b.base_id = get_user_base_id()
   )))
);

CREATE POLICY "Users can view component stock links for their base"
ON public.component_stock_links
FOR SELECT
USING (
  get_user_role() = 'direction'::user_role OR 
  (component_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.boat_components bc
    JOIN public.boats b ON b.id = bc.boat_id
    WHERE bc.id = component_stock_links.component_id AND b.base_id = get_user_base_id()
  )) OR
  (sub_component_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.boat_sub_components bsc
    JOIN public.boat_components bc ON bc.id = bsc.parent_component_id
    JOIN public.boats b ON b.id = bc.boat_id
    WHERE bsc.id = component_stock_links.sub_component_id AND b.base_id = get_user_base_id()
  ))
);

-- RLS policies for component_purchase_history
CREATE POLICY "Direction and chef_base can manage component purchase history"
ON public.component_purchase_history
FOR ALL
USING (
  get_user_role() = ANY(ARRAY['direction'::user_role, 'chef_base'::user_role]) AND
  (get_user_role() = 'direction'::user_role OR 
   (component_id IS NOT NULL AND EXISTS (
     SELECT 1 FROM public.boat_components bc
     JOIN public.boats b ON b.id = bc.boat_id
     WHERE bc.id = component_purchase_history.component_id AND b.base_id = get_user_base_id()
   )) OR
   (sub_component_id IS NOT NULL AND EXISTS (
     SELECT 1 FROM public.boat_sub_components bsc
     JOIN public.boat_components bc ON bc.id = bsc.parent_component_id
     JOIN public.boats b ON b.id = bc.boat_id
     WHERE bsc.id = component_purchase_history.sub_component_id AND b.base_id = get_user_base_id()
   )))
);

CREATE POLICY "Users can view component purchase history for their base"
ON public.component_purchase_history
FOR SELECT
USING (
  get_user_role() = 'direction'::user_role OR 
  (component_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.boat_components bc
    JOIN public.boats b ON b.id = bc.boat_id
    WHERE bc.id = component_purchase_history.component_id AND b.base_id = get_user_base_id()
  )) OR
  (sub_component_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.boat_sub_components bsc
    JOIN public.boat_components bc ON bc.id = bsc.parent_component_id
    JOIN public.boats b ON b.id = bc.boat_id
    WHERE bsc.id = component_purchase_history.sub_component_id AND b.base_id = get_user_base_id()
  ))
);

-- RLS policies for component_supplier_references
CREATE POLICY "Direction and chef_base can manage component supplier references"
ON public.component_supplier_references
FOR ALL
USING (
  get_user_role() = ANY(ARRAY['direction'::user_role, 'chef_base'::user_role]) AND
  (get_user_role() = 'direction'::user_role OR 
   (component_id IS NOT NULL AND EXISTS (
     SELECT 1 FROM public.boat_components bc
     JOIN public.boats b ON b.id = bc.boat_id
     WHERE bc.id = component_supplier_references.component_id AND b.base_id = get_user_base_id()
   )) OR
   (sub_component_id IS NOT NULL AND EXISTS (
     SELECT 1 FROM public.boat_sub_components bsc
     JOIN public.boat_components bc ON bc.id = bsc.parent_component_id
     JOIN public.boats b ON b.id = bc.boat_id
     WHERE bsc.id = component_supplier_references.sub_component_id AND b.base_id = get_user_base_id()
   )))
);

CREATE POLICY "Users can view component supplier references for their base"
ON public.component_supplier_references
FOR SELECT
USING (
  get_user_role() = 'direction'::user_role OR 
  (component_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.boat_components bc
    JOIN public.boats b ON b.id = bc.boat_id
    WHERE bc.id = component_supplier_references.component_id AND b.base_id = get_user_base_id()
  )) OR
  (sub_component_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.boat_sub_components bsc
    JOIN public.boat_components bc ON bc.id = bsc.parent_component_id
    JOIN public.boats b ON b.id = bc.boat_id
    WHERE bsc.id = component_supplier_references.sub_component_id AND b.base_id = get_user_base_id()
  ))
);

-- Add triggers for updated_at
CREATE TRIGGER update_boat_sub_components_updated_at
  BEFORE UPDATE ON public.boat_sub_components
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_component_stock_links_updated_at
  BEFORE UPDATE ON public.component_stock_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_component_supplier_references_updated_at
  BEFORE UPDATE ON public.component_supplier_references
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_boat_sub_components_parent_component_id ON public.boat_sub_components(parent_component_id);
CREATE INDEX idx_component_stock_links_component_id ON public.component_stock_links(component_id);
CREATE INDEX idx_component_stock_links_sub_component_id ON public.component_stock_links(sub_component_id);
CREATE INDEX idx_component_stock_links_stock_item_id ON public.component_stock_links(stock_item_id);
CREATE INDEX idx_component_purchase_history_component_id ON public.component_purchase_history(component_id);
CREATE INDEX idx_component_purchase_history_sub_component_id ON public.component_purchase_history(sub_component_id);
CREATE INDEX idx_component_supplier_references_component_id ON public.component_supplier_references(component_id);
CREATE INDEX idx_component_supplier_references_sub_component_id ON public.component_supplier_references(sub_component_id);