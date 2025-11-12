-- Créer une table pour les événements de suivi des expéditions
CREATE TABLE IF NOT EXISTS public.shipment_tracking_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  preparation_id UUID NOT NULL REFERENCES shipment_preparations(id) ON DELETE CASCADE,
  carrier TEXT NOT NULL,
  tracking_number TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'exception', 'info'
  status TEXT NOT NULL,
  status_description TEXT,
  location TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  estimated_delivery TIMESTAMP WITH TIME ZONE,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX idx_tracking_events_preparation ON shipment_tracking_events(preparation_id);
CREATE INDEX idx_tracking_events_tracking_number ON shipment_tracking_events(tracking_number);
CREATE INDEX idx_tracking_events_event_date ON shipment_tracking_events(event_date DESC);

-- Enable RLS
ALTER TABLE public.shipment_tracking_events ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view tracking events for their base shipments"
  ON public.shipment_tracking_events
  FOR SELECT
  USING (
    get_user_role() = 'direction'::user_role 
    OR EXISTS (
      SELECT 1 FROM shipment_preparations sp
      WHERE sp.id = shipment_tracking_events.preparation_id
      AND (
        sp.source_base_id = get_user_base_id()
        OR sp.destination_base_id = get_user_base_id()
      )
    )
  );

CREATE POLICY "System can insert tracking events"
  ON public.shipment_tracking_events
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Direction and chef_base can manage tracking events"
  ON public.shipment_tracking_events
  FOR ALL
  USING (
    get_user_role() = ANY(ARRAY['direction'::user_role, 'chef_base'::user_role])
    AND (
      get_user_role() = 'direction'::user_role
      OR EXISTS (
        SELECT 1 FROM shipment_preparations sp
        WHERE sp.id = shipment_tracking_events.preparation_id
        AND (
          sp.source_base_id = get_user_base_id()
          OR sp.destination_base_id = get_user_base_id()
        )
      )
    )
  );

-- Trigger pour updated_at
CREATE TRIGGER update_shipment_tracking_events_updated_at
  BEFORE UPDATE ON public.shipment_tracking_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Ajouter une colonne pour le dernier événement de tracking dans shipment_preparations
ALTER TABLE public.shipment_preparations 
ADD COLUMN IF NOT EXISTS last_tracking_event TEXT,
ADD COLUMN IF NOT EXISTS last_tracking_update TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tracking_status TEXT DEFAULT 'pending';

-- Créer une table pour les configurations de notification des expéditions
CREATE TABLE IF NOT EXISTS public.shipment_notification_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_id UUID NOT NULL REFERENCES bases(id),
  notify_on_pickup BOOLEAN DEFAULT true,
  notify_on_in_transit BOOLEAN DEFAULT false,
  notify_on_out_for_delivery BOOLEAN DEFAULT true,
  notify_on_delivered BOOLEAN DEFAULT true,
  notify_on_exception BOOLEAN DEFAULT true,
  recipient_emails TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(base_id)
);

-- Enable RLS
ALTER TABLE public.shipment_notification_configs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view notification configs for their base"
  ON public.shipment_notification_configs
  FOR SELECT
  USING (
    get_user_role() = 'direction'::user_role 
    OR base_id = get_user_base_id()
  );

CREATE POLICY "Direction and chef_base can manage notification configs"
  ON public.shipment_notification_configs
  FOR ALL
  USING (
    get_user_role() = ANY(ARRAY['direction'::user_role, 'chef_base'::user_role])
    AND (
      get_user_role() = 'direction'::user_role
      OR base_id = get_user_base_id()
    )
  );