
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('direction', 'chef_base', 'technicien');
CREATE TYPE boat_status AS ENUM ('available', 'rented', 'maintenance', 'out_of_service');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'delivered', 'cancelled');
CREATE TYPE maintenance_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE maintenance_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE intervention_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE checklist_status AS ENUM ('ok', 'needs_repair', 'not_checked');
CREATE TYPE checklist_overall_status AS ENUM ('ok', 'needs_attention', 'major_issues');
CREATE TYPE alert_type AS ENUM ('stock', 'maintenance', 'document', 'system');
CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'error');

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'technicien',
  base_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bases table
CREATE TABLE public.bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  manager TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create boats table
CREATE TABLE public.boats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT UNIQUE NOT NULL,
  year INTEGER NOT NULL,
  status boat_status DEFAULT 'available',
  base_id UUID REFERENCES public.bases(id),
  documents TEXT[] DEFAULT '{}',
  next_maintenance DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  category TEXT,
  base_id UUID REFERENCES public.bases(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES public.suppliers(id),
  base_id UUID REFERENCES public.bases(id),
  order_number TEXT UNIQUE NOT NULL,
  status order_status DEFAULT 'pending',
  total_amount DECIMAL(10,2) DEFAULT 0,
  order_date DATE DEFAULT CURRENT_DATE,
  delivery_date DATE,
  documents TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- Create stock_items table
CREATE TABLE public.stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  reference TEXT,
  category TEXT,
  quantity INTEGER DEFAULT 0,
  min_threshold INTEGER DEFAULT 0,
  unit TEXT,
  location TEXT,
  base_id UUID REFERENCES public.bases(id),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create maintenance_tasks table
CREATE TABLE public.maintenance_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boat_id UUID REFERENCES public.boats(id),
  title TEXT NOT NULL,
  description TEXT,
  status maintenance_status DEFAULT 'pending',
  priority maintenance_priority DEFAULT 'medium',
  assigned_to UUID REFERENCES public.profiles(id),
  estimated_duration INTEGER, -- in hours
  actual_duration INTEGER, -- in hours
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Create interventions table
CREATE TABLE public.interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boat_id UUID REFERENCES public.boats(id),
  technician_id UUID REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  status intervention_status DEFAULT 'scheduled',
  scheduled_date DATE,
  completed_date DATE,
  base_id UUID REFERENCES public.bases(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create intervention_tasks junction table
CREATE TABLE public.intervention_tasks (
  intervention_id UUID REFERENCES public.interventions(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.maintenance_tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (intervention_id, task_id)
);

-- Create checklist_items table
CREATE TABLE public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  is_required BOOLEAN DEFAULT FALSE,
  status checklist_status DEFAULT 'not_checked',
  notes TEXT
);

-- Create boat_checklists table
CREATE TABLE public.boat_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boat_id UUID REFERENCES public.boats(id),
  checklist_date DATE DEFAULT CURRENT_DATE,
  technician_id UUID REFERENCES public.profiles(id),
  overall_status checklist_overall_status DEFAULT 'ok',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create boat_checklist_items junction table
CREATE TABLE public.boat_checklist_items (
  checklist_id UUID REFERENCES public.boat_checklists(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.checklist_items(id),
  status checklist_status DEFAULT 'not_checked',
  notes TEXT,
  PRIMARY KEY (checklist_id, item_id)
);

-- Create alerts table
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type alert_type NOT NULL,
  severity alert_severity DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  base_id UUID REFERENCES public.bases(id),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint for profiles.base_id after bases table is created
ALTER TABLE public.profiles ADD CONSTRAINT profiles_base_id_fkey 
FOREIGN KEY (base_id) REFERENCES public.bases(id);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boat_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boat_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Create security definer function to get user base_id
CREATE OR REPLACE FUNCTION public.get_user_base_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT base_id FROM public.profiles WHERE id = auth.uid();
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for bases
CREATE POLICY "Direction can view all bases" ON public.bases
  FOR SELECT USING (public.get_user_role() = 'direction');

CREATE POLICY "Chef base and technicien can view their base" ON public.bases
  FOR SELECT USING (
    public.get_user_role() IN ('chef_base', 'technicien') 
    AND id = public.get_user_base_id()
  );

CREATE POLICY "Direction can manage all bases" ON public.bases
  FOR ALL USING (public.get_user_role() = 'direction');

-- RLS Policies for boats
CREATE POLICY "Users can view boats in their base or all if direction" ON public.boats
  FOR SELECT USING (
    public.get_user_role() = 'direction' 
    OR base_id = public.get_user_base_id()
  );

CREATE POLICY "Direction and chef_base can manage boats" ON public.boats
  FOR ALL USING (
    public.get_user_role() IN ('direction', 'chef_base')
    AND (public.get_user_role() = 'direction' OR base_id = public.get_user_base_id())
  );

-- RLS Policies for suppliers
CREATE POLICY "Users can view suppliers in their base or all if direction" ON public.suppliers
  FOR SELECT USING (
    public.get_user_role() = 'direction' 
    OR base_id = public.get_user_base_id()
  );

CREATE POLICY "Direction and chef_base can manage suppliers" ON public.suppliers
  FOR ALL USING (
    public.get_user_role() IN ('direction', 'chef_base')
    AND (public.get_user_role() = 'direction' OR base_id = public.get_user_base_id())
  );

-- RLS Policies for orders
CREATE POLICY "Users can view orders in their base or all if direction" ON public.orders
  FOR SELECT USING (
    public.get_user_role() = 'direction' 
    OR base_id = public.get_user_base_id()
  );

CREATE POLICY "Direction and chef_base can manage orders" ON public.orders
  FOR ALL USING (
    public.get_user_role() IN ('direction', 'chef_base')
    AND (public.get_user_role() = 'direction' OR base_id = public.get_user_base_id())
  );

-- RLS Policies for order_items (inherited from orders)
CREATE POLICY "Users can view order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = order_id 
      AND (
        public.get_user_role() = 'direction' 
        OR o.base_id = public.get_user_base_id()
      )
    )
  );

CREATE POLICY "Direction and chef_base can manage order items" ON public.order_items
  FOR ALL USING (
    public.get_user_role() IN ('direction', 'chef_base')
    AND EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = order_id 
      AND (
        public.get_user_role() = 'direction' 
        OR o.base_id = public.get_user_base_id()
      )
    )
  );

-- RLS Policies for stock_items
CREATE POLICY "Users can view stock in their base or all if direction" ON public.stock_items
  FOR SELECT USING (
    public.get_user_role() = 'direction' 
    OR base_id = public.get_user_base_id()
  );

CREATE POLICY "Direction and chef_base can manage stock" ON public.stock_items
  FOR ALL USING (
    public.get_user_role() IN ('direction', 'chef_base')
    AND (public.get_user_role() = 'direction' OR base_id = public.get_user_base_id())
  );

-- RLS Policies for maintenance_tasks
CREATE POLICY "Users can view maintenance tasks" ON public.maintenance_tasks
  FOR SELECT USING (
    public.get_user_role() = 'direction' 
    OR EXISTS (
      SELECT 1 FROM public.boats b 
      WHERE b.id = boat_id 
      AND b.base_id = public.get_user_base_id()
    )
    OR assigned_to = auth.uid()
  );

CREATE POLICY "Users can manage maintenance tasks" ON public.maintenance_tasks
  FOR ALL USING (
    public.get_user_role() = 'direction' 
    OR EXISTS (
      SELECT 1 FROM public.boats b 
      WHERE b.id = boat_id 
      AND b.base_id = public.get_user_base_id()
    )
  );

-- RLS Policies for interventions
CREATE POLICY "Users can view interventions" ON public.interventions
  FOR SELECT USING (
    public.get_user_role() = 'direction' 
    OR base_id = public.get_user_base_id()
    OR technician_id = auth.uid()
  );

CREATE POLICY "Users can manage interventions" ON public.interventions
  FOR ALL USING (
    public.get_user_role() = 'direction' 
    OR base_id = public.get_user_base_id()
  );

-- RLS Policies for intervention_tasks
CREATE POLICY "Users can view intervention tasks" ON public.intervention_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.interventions i 
      WHERE i.id = intervention_id 
      AND (
        public.get_user_role() = 'direction' 
        OR i.base_id = public.get_user_base_id()
        OR i.technician_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage intervention tasks" ON public.intervention_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.interventions i 
      WHERE i.id = intervention_id 
      AND (
        public.get_user_role() = 'direction' 
        OR i.base_id = public.get_user_base_id()
      )
    )
  );

-- RLS Policies for checklist_items (global items, readable by all)
CREATE POLICY "All users can view checklist items" ON public.checklist_items
  FOR SELECT USING (true);

CREATE POLICY "Direction and chef_base can manage checklist items" ON public.checklist_items
  FOR ALL USING (public.get_user_role() IN ('direction', 'chef_base'));

-- RLS Policies for boat_checklists
CREATE POLICY "Users can view boat checklists" ON public.boat_checklists
  FOR SELECT USING (
    public.get_user_role() = 'direction' 
    OR EXISTS (
      SELECT 1 FROM public.boats b 
      WHERE b.id = boat_id 
      AND b.base_id = public.get_user_base_id()
    )
    OR technician_id = auth.uid()
  );

CREATE POLICY "Users can manage boat checklists" ON public.boat_checklists
  FOR ALL USING (
    public.get_user_role() = 'direction' 
    OR EXISTS (
      SELECT 1 FROM public.boats b 
      WHERE b.id = boat_id 
      AND b.base_id = public.get_user_base_id()
    )
  );

-- RLS Policies for boat_checklist_items
CREATE POLICY "Users can view boat checklist items" ON public.boat_checklist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.boat_checklists bc
      JOIN public.boats b ON b.id = bc.boat_id
      WHERE bc.id = checklist_id 
      AND (
        public.get_user_role() = 'direction' 
        OR b.base_id = public.get_user_base_id()
        OR bc.technician_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage boat checklist items" ON public.boat_checklist_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.boat_checklists bc
      JOIN public.boats b ON b.id = bc.boat_id
      WHERE bc.id = checklist_id 
      AND (
        public.get_user_role() = 'direction' 
        OR b.base_id = public.get_user_base_id()
      )
    )
  );

-- RLS Policies for alerts
CREATE POLICY "Users can view alerts in their base or all if direction" ON public.alerts
  FOR SELECT USING (
    public.get_user_role() = 'direction' 
    OR base_id = public.get_user_base_id()
    OR base_id IS NULL -- system-wide alerts
  );

CREATE POLICY "Direction and chef_base can manage alerts" ON public.alerts
  FOR ALL USING (
    public.get_user_role() IN ('direction', 'chef_base')
    AND (public.get_user_role() = 'direction' OR base_id = public.get_user_base_id() OR base_id IS NULL)
  );

-- Create trigger function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'technicien'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample data for testing
INSERT INTO public.bases (id, name, location, phone, email, manager) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Base Martinique', 'Fort-de-France, Martinique', '+596 596 123 456', 'martinique@example.com', 'Jean Dupont'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Base Guadeloupe', 'Pointe-à-Pitre, Guadeloupe', '+590 590 123 456', 'guadeloupe@example.com', 'Marie Martin'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Base Saint-Martin', 'Marigot, Saint-Martin', '+590 590 654 321', 'saintmartin@example.com', 'Pierre Dubois');

-- Insert sample checklist items
INSERT INTO public.checklist_items (name, category, is_required) VALUES
  ('Vérification de la coque', 'Structure', true),
  ('Test du moteur principal', 'Moteur', true),
  ('Contrôle des voiles', 'Gréement', true),
  ('Vérification de l''électronique', 'Électronique', true),
  ('Test du gouvernail', 'Navigation', true),
  ('Contrôle des feux de navigation', 'Sécurité', true),
  ('Vérification des gilets de sauvetage', 'Sécurité', true),
  ('Test de la radio VHF', 'Communication', true),
  ('Contrôle du GPS', 'Navigation', false),
  ('Vérification de l''ancre', 'Mouillage', true);
