-- 1. Historique des statuts
CREATE TABLE public.supply_request_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supply_request_id uuid NOT NULL REFERENCES public.supply_requests(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid,
  changed_by_name text,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_srsh_request ON public.supply_request_status_history(supply_request_id, created_at DESC);

GRANT SELECT ON public.supply_request_status_history TO authenticated;
GRANT ALL ON public.supply_request_status_history TO service_role;

ALTER TABLE public.supply_request_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view status history of visible requests"
ON public.supply_request_status_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.supply_requests sr
    WHERE sr.id = supply_request_status_history.supply_request_id
      AND (
        public.get_user_role() = 'direction'::user_role
        OR sr.base_id = public.get_user_base_id()
        OR sr.requested_by = auth.uid()
      )
  )
);

-- 2. Trigger d'enregistrement de l'historique
CREATE OR REPLACE FUNCTION public.log_supply_request_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  SELECT name INTO v_name FROM public.profiles WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.supply_request_status_history
      (supply_request_id, old_status, new_status, changed_by, changed_by_name, comment)
    VALUES (NEW.id, NULL, COALESCE(NEW.status, 'pending'), auth.uid(), COALESCE(v_name, 'Système'), 'Demande créée');
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.supply_request_status_history
      (supply_request_id, old_status, new_status, changed_by, changed_by_name, comment)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), COALESCE(v_name, 'Système'),
            CASE WHEN NEW.status = 'rejected' THEN NEW.rejection_reason ELSE NULL END);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_supply_request_status_history_insert
AFTER INSERT ON public.supply_requests
FOR EACH ROW EXECUTE FUNCTION public.log_supply_request_status_change();

CREATE TRIGGER trg_supply_request_status_history_update
AFTER UPDATE OF status ON public.supply_requests
FOR EACH ROW EXECUTE FUNCTION public.log_supply_request_status_change();

-- Historique initial pour les demandes existantes
INSERT INTO public.supply_request_status_history
  (supply_request_id, old_status, new_status, changed_by, changed_by_name, comment, created_at)
SELECT sr.id, NULL, COALESCE(sr.status, 'pending'), sr.requested_by,
       COALESCE(p.name, 'Utilisateur'), 'Statut initial (avant historisation)', sr.created_at
FROM public.supply_requests sr
LEFT JOIN public.profiles p ON p.id = sr.requested_by;

-- 3. Pièces jointes dans les commentaires
ALTER TABLE public.supply_request_comments
ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 4. Notification à chaque nouveau commentaire
CREATE OR REPLACE FUNCTION public.notify_supply_request_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.supply_requests;
  v_user_id uuid;
BEGIN
  SELECT * INTO v_request FROM public.supply_requests WHERE id = NEW.supply_request_id;
  IF v_request.id IS NULL THEN
    RETURN NEW;
  END IF;

  FOR v_user_id IN
    SELECT DISTINCT p.id
    FROM public.profiles p
    WHERE (
      p.id = v_request.requested_by
      OR p.role = 'direction'::user_role
      OR (p.role = 'chef_base'::user_role AND p.base_id = v_request.base_id)
    )
    AND p.id IS DISTINCT FROM NEW.author_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_user_id,
      'supply_request_comment',
      'Nouveau commentaire sur une demande',
      COALESCE(NEW.author_name, 'Un utilisateur') || ' a commenté la demande ' ||
      COALESCE(v_request.request_number, '') || ' (' || COALESCE(v_request.item_name, '') || ')',
      jsonb_build_object(
        'supply_request_id', v_request.id,
        'request_number', v_request.request_number,
        'comment_id', NEW.id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_supply_request_comment
AFTER INSERT ON public.supply_request_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_supply_request_comment();

-- 5. Stockage des pièces jointes (bucket purchase-requests, public en lecture)
CREATE POLICY "Authenticated users can upload purchase request attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'purchase-requests');

CREATE POLICY "Authenticated users can update purchase request attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'purchase-requests');
