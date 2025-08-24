-- Create stock_reservations table for tracking reserved stock items
CREATE TABLE public.stock_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_item_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  intervention_id UUID REFERENCES public.interventions(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  reserved_by UUID REFERENCES auth.users(id),
  reserved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  released_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'released')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;

-- Create policies for stock reservations
CREATE POLICY "Users can view reservations for their base stock items" 
ON public.stock_reservations 
FOR SELECT 
USING (
  get_user_role() = 'direction'::user_role OR 
  EXISTS (
    SELECT 1 FROM public.stock_items si 
    WHERE si.id = stock_reservations.stock_item_id 
    AND si.base_id = get_user_base_id()
  )
);

CREATE POLICY "Technicians and above can manage reservations" 
ON public.stock_reservations 
FOR ALL 
USING (
  get_user_role() = ANY(ARRAY['direction'::user_role, 'chef_base'::user_role, 'technicien'::user_role]) AND
  (
    get_user_role() = 'direction'::user_role OR 
    EXISTS (
      SELECT 1 FROM public.stock_items si 
      WHERE si.id = stock_reservations.stock_item_id 
      AND si.base_id = get_user_base_id()
    )
  )
)
WITH CHECK (
  get_user_role() = ANY(ARRAY['direction'::user_role, 'chef_base'::user_role, 'technicien'::user_role]) AND
  (
    get_user_role() = 'direction'::user_role OR 
    EXISTS (
      SELECT 1 FROM public.stock_items si 
      WHERE si.id = stock_reservations.stock_item_id 
      AND si.base_id = get_user_base_id()
    )
  )
);

-- Create trigger for updating updated_at
CREATE TRIGGER update_stock_reservations_updated_at
  BEFORE UPDATE ON public.stock_reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_stock_reservations_stock_item_id ON public.stock_reservations(stock_item_id);
CREATE INDEX idx_stock_reservations_intervention_id ON public.stock_reservations(intervention_id);
CREATE INDEX idx_stock_reservations_status ON public.stock_reservations(status);