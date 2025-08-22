-- Create safety control categories table
CREATE TABLE public.safety_control_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  frequency_months INTEGER NOT NULL DEFAULT 12,
  color_code TEXT DEFAULT '#3b82f6',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create boat safety controls table (one record per boat/year/category)
CREATE TABLE public.boat_safety_controls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  boat_id UUID NOT NULL,
  category_id UUID NOT NULL,
  control_year INTEGER NOT NULL,
  control_date DATE,
  next_control_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'failed')),
  performed_by UUID,
  validated_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(boat_id, category_id, control_year)
);

-- Create boat safety control items table (detailed items for each control)
CREATE TABLE public.boat_safety_control_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  control_id UUID NOT NULL REFERENCES public.boat_safety_controls(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_checked' CHECK (status IN ('not_checked', 'ok', 'to_repair', 'to_replace', 'missing')),
  expiry_date DATE,
  quantity INTEGER DEFAULT 1,
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.safety_control_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boat_safety_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boat_safety_control_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for safety_control_categories
CREATE POLICY "Users can view safety control categories" 
ON public.safety_control_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Direction and chef_base can manage safety control categories" 
ON public.safety_control_categories 
FOR ALL 
USING (get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role]));

-- RLS Policies for boat_safety_controls
CREATE POLICY "Users can view boat safety controls for their base" 
ON public.boat_safety_controls 
FOR SELECT 
USING (
  get_user_role() = 'direction'::user_role 
  OR EXISTS (
    SELECT 1 FROM boats b 
    WHERE b.id = boat_safety_controls.boat_id 
    AND b.base_id = get_user_base_id()
  )
);

CREATE POLICY "Direction and chef_base can manage boat safety controls" 
ON public.boat_safety_controls 
FOR ALL 
USING (
  (get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role, 'technicien'::user_role]))
  AND (
    get_user_role() = 'direction'::user_role 
    OR EXISTS (
      SELECT 1 FROM boats b 
      WHERE b.id = boat_safety_controls.boat_id 
      AND b.base_id = get_user_base_id()
    )
  )
);

-- RLS Policies for boat_safety_control_items
CREATE POLICY "Users can view boat safety control items for their base" 
ON public.boat_safety_control_items 
FOR SELECT 
USING (
  get_user_role() = 'direction'::user_role 
  OR EXISTS (
    SELECT 1 FROM boat_safety_controls bsc
    JOIN boats b ON b.id = bsc.boat_id
    WHERE bsc.id = boat_safety_control_items.control_id 
    AND b.base_id = get_user_base_id()
  )
);

CREATE POLICY "Direction and chef_base can manage boat safety control items" 
ON public.boat_safety_control_items 
FOR ALL 
USING (
  (get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role, 'technicien'::user_role]))
  AND (
    get_user_role() = 'direction'::user_role 
    OR EXISTS (
      SELECT 1 FROM boat_safety_controls bsc
      JOIN boats b ON b.id = bsc.boat_id
      WHERE bsc.id = boat_safety_control_items.control_id 
      AND b.base_id = get_user_base_id()
    )
  )
);

-- Insert default safety control categories
INSERT INTO public.safety_control_categories (name, description, frequency_months, color_code) VALUES 
('Carénage', 'Contrôle de la coque et carénage annuel', 12, '#ef4444'),
('Fusées', 'Vérification des fusées de détresse', 12, '#f97316'),
('Extincteurs', 'Contrôle des extincteurs', 12, '#eab308'),
('Trousses pharmacie', 'Vérification du contenu des trousses de secours', 6, '#22c55e'),
('Radeaux survie', 'Contrôle et révision des radeaux de survie', 12, '#3b82f6'),
('Flexibles gaz', 'Vérification des flexibles de gaz', 12, '#8b5cf6'),
('Gréement', 'Contrôle du gréement et des équipements de sécurité', 12, '#06b6d4');

-- Add trigger for updated_at
CREATE TRIGGER update_safety_control_categories_updated_at
BEFORE UPDATE ON public.safety_control_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_boat_safety_controls_updated_at
BEFORE UPDATE ON public.boat_safety_controls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_boat_safety_control_items_updated_at
BEFORE UPDATE ON public.boat_safety_control_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();