-- Create the checkin_checkout_orders table for assignment system
CREATE TABLE public.checkin_checkout_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boat_id uuid REFERENCES public.boats(id) NOT NULL,
  technician_id uuid REFERENCES public.profiles(id),
  order_type text NOT NULL CHECK (order_type IN ('checkin', 'checkout')),
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NOT NULL,
  status text DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'cancelled')),
  rental_data jsonb, -- Pre-filled rental data
  notes text,
  created_by uuid REFERENCES public.profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_checklist_id uuid REFERENCES public.boat_checklists(id), -- Link to completed checklist
  base_id uuid REFERENCES public.bases(id) NOT NULL
);

-- Enable RLS
ALTER TABLE public.checkin_checkout_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Direction and chef_base can manage checkin checkout orders" 
ON public.checkin_checkout_orders 
FOR ALL 
USING (
  (get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role])) 
  AND (
    get_user_role() = 'direction'::user_role 
    OR base_id = get_user_base_id()
  )
);

CREATE POLICY "Technicians can view and update their assigned orders" 
ON public.checkin_checkout_orders 
FOR ALL 
USING (
  technician_id = auth.uid() 
  OR get_user_role() = 'direction'::user_role 
  OR (
    get_user_role() = 'chef_base'::user_role 
    AND base_id = get_user_base_id()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_checkin_checkout_orders_updated_at
BEFORE UPDATE ON public.checkin_checkout_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_checkin_checkout_orders_technician_id ON public.checkin_checkout_orders(technician_id);
CREATE INDEX idx_checkin_checkout_orders_boat_id ON public.checkin_checkout_orders(boat_id);
CREATE INDEX idx_checkin_checkout_orders_base_id ON public.checkin_checkout_orders(base_id);
CREATE INDEX idx_checkin_checkout_orders_scheduled_start ON public.checkin_checkout_orders(scheduled_start);
CREATE INDEX idx_checkin_checkout_orders_status ON public.checkin_checkout_orders(status);