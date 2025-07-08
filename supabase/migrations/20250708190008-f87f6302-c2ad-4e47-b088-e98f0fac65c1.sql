-- Extend order_status enum to include purchase request statuses
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'pending_approval';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'supplier_requested';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'shipping_mainland';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'shipping_antilles';

-- Add new columns to orders table for purchase requests
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS is_purchase_request boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS boat_id uuid REFERENCES public.boats(id),
ADD COLUMN IF NOT EXISTS urgency_level text DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS requested_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS photos text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tracking_url text,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS request_notes text;

-- Create storage bucket for purchase request photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('purchase-requests', 'purchase-requests', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for purchase request photos
CREATE POLICY "Users can upload purchase request photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'purchase-requests' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view purchase request photos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'purchase-requests' AND 
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    get_user_role() = 'direction'
  )
);

CREATE POLICY "Users can update their purchase request photos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'purchase-requests' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their purchase request photos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'purchase-requests' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create function to send purchase request notifications
CREATE OR REPLACE FUNCTION public.handle_purchase_request_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only handle purchase requests
  IF NEW.is_purchase_request != true THEN
    RETURN NEW;
  END IF;

  -- Send notification when status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify the requester about status changes
    IF NEW.requested_by IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        data
      ) VALUES (
        NEW.requested_by,
        'purchase_request_status',
        'Demande d''achat mise à jour',
        'Le statut de votre demande d''achat ' || NEW.order_number || ' a été mis à jour.',
        jsonb_build_object(
          'order_id', NEW.id,
          'order_number', NEW.order_number,
          'old_status', OLD.status,
          'new_status', NEW.status
        )
      );
    END IF;

    -- Notify direction when new request is created
    IF NEW.status = 'pending_approval' AND OLD.status IS NULL THEN
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        data
      )
      SELECT 
        p.id,
        'purchase_request_approval',
        'Nouvelle demande d''achat',
        'Une nouvelle demande d''achat ' || NEW.order_number || ' nécessite votre approbation.',
        jsonb_build_object(
          'order_id', NEW.id,
          'order_number', NEW.order_number,
          'requested_by', NEW.requested_by
        )
      FROM public.profiles p
      WHERE p.role = 'direction';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for purchase request notifications
DROP TRIGGER IF EXISTS purchase_request_status_trigger ON public.orders;
CREATE TRIGGER purchase_request_status_trigger
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_purchase_request_status_change();