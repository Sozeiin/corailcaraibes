-- Étape 1: Créer les nouveaux statuts pour le workflow complet
CREATE TYPE public.purchase_workflow_status AS ENUM (
  'draft',
  'pending_approval',
  'approved',
  'supplier_search',
  'order_confirmed',
  'shipping_antilles',
  'received_scanned',
  'completed',
  'rejected',
  'cancelled'
);

-- Étape 2: Créer la table de suivi du workflow
CREATE TABLE public.purchase_workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  step_status public.purchase_workflow_status NOT NULL,
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  step_description TEXT,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  notes TEXT,
  auto_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Étape 3: Ajouter les index pour les performances
CREATE INDEX idx_workflow_steps_order_id ON public.purchase_workflow_steps(order_id);
CREATE INDEX idx_workflow_steps_status ON public.purchase_workflow_steps(step_status);
CREATE INDEX idx_workflow_steps_user ON public.purchase_workflow_steps(user_id);

-- Étape 4: Créer une table pour les notifications de workflow
CREATE TABLE public.workflow_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id),
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Étape 5: Créer une fonction pour initialiser le workflow
CREATE OR REPLACE FUNCTION public.initialize_purchase_workflow(order_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  order_record RECORD;
BEGIN
  -- Récupérer les détails de la commande
  SELECT * INTO order_record FROM public.orders WHERE id = order_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found with id: %', order_id_param;
  END IF;
  
  -- Initialiser les étapes du workflow pour une demande d'achat
  IF order_record.is_purchase_request = true THEN
    INSERT INTO public.purchase_workflow_steps (order_id, step_status, step_number, step_name, step_description, user_id, user_name, completed_at)
    VALUES 
      (order_id_param, 'pending_approval', 1, 'En attente d''approbation', 'Demande créée et en attente d''approbation par la direction', order_record.requested_by, NULL, NULL);
  ELSE
    -- Pour les commandes normales, commencer directement à la recherche de fournisseurs
    INSERT INTO public.purchase_workflow_steps (order_id, step_status, step_number, step_name, step_description, completed_at)
    VALUES 
      (order_id_param, 'supplier_search', 3, 'Recherche de fournisseurs', 'Recherche et négociation avec les fournisseurs', now());
  END IF;
END;
$$;

-- Étape 6: Créer une fonction pour faire avancer le workflow
CREATE OR REPLACE FUNCTION public.advance_workflow_step(
  order_id_param UUID,
  new_status public.purchase_workflow_status,
  user_id_param UUID DEFAULT NULL,
  notes_param TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_step RECORD;
  step_info RECORD;
  user_name_val TEXT;
BEGIN
  -- Récupérer le nom de l'utilisateur
  IF user_id_param IS NOT NULL THEN
    SELECT COALESCE(p.name, auth.email()) INTO user_name_val 
    FROM public.profiles p 
    WHERE p.id = user_id_param;
  END IF;
  
  -- Marquer l'étape actuelle comme terminée
  UPDATE public.purchase_workflow_steps 
  SET 
    completed_at = now(),
    duration_minutes = EXTRACT(EPOCH FROM (now() - started_at))/60,
    notes = COALESCE(notes_param, notes)
  WHERE order_id = order_id_param 
    AND completed_at IS NULL;
  
  -- Déterminer les informations de la nouvelle étape
  SELECT 
    CASE new_status
      WHEN 'pending_approval' THEN 1
      WHEN 'approved' THEN 2
      WHEN 'supplier_search' THEN 3
      WHEN 'order_confirmed' THEN 4
      WHEN 'shipping_antilles' THEN 5
      WHEN 'received_scanned' THEN 6
      WHEN 'completed' THEN 7
      WHEN 'rejected' THEN 99
      WHEN 'cancelled' THEN 98
      ELSE 0
    END as step_number,
    CASE new_status
      WHEN 'pending_approval' THEN 'En attente d''approbation'
      WHEN 'approved' THEN 'Approuvé par direction'
      WHEN 'supplier_search' THEN 'Recherche de fournisseurs'
      WHEN 'order_confirmed' THEN 'Commande confirmée'
      WHEN 'shipping_antilles' THEN 'Envoi vers Antilles'
      WHEN 'received_scanned' THEN 'Réception scannée'
      WHEN 'completed' THEN 'Terminé'
      WHEN 'rejected' THEN 'Rejeté'
      WHEN 'cancelled' THEN 'Annulé'
      ELSE 'Étape inconnue'
    END as step_name,
    CASE new_status
      WHEN 'pending_approval' THEN 'Demande en attente d''approbation par la direction'
      WHEN 'approved' THEN 'Demande approuvée, prête pour la recherche de fournisseurs'
      WHEN 'supplier_search' THEN 'Recherche et négociation avec les fournisseurs'
      WHEN 'order_confirmed' THEN 'Commande passée et confirmée par le fournisseur'
      WHEN 'shipping_antilles' THEN 'Produits expédiés vers les Antilles'
      WHEN 'received_scanned' THEN 'Produits reçus et scannés en stock'
      WHEN 'completed' THEN 'Processus d''achat terminé avec succès'
      WHEN 'rejected' THEN 'Demande rejetée par la direction'
      WHEN 'cancelled' THEN 'Demande annulée'
      ELSE 'Description non disponible'
    END as step_description
  INTO step_info;
  
  -- Créer la nouvelle étape
  INSERT INTO public.purchase_workflow_steps (
    order_id, 
    step_status, 
    step_number, 
    step_name, 
    step_description,
    user_id,
    user_name,
    notes,
    completed_at
  ) VALUES (
    order_id_param,
    new_status,
    step_info.step_number,
    step_info.step_name,
    step_info.step_description,
    user_id_param,
    user_name_val,
    notes_param,
    CASE WHEN new_status IN ('rejected', 'cancelled', 'completed') THEN now() ELSE NULL END
  );
  
  -- Mettre à jour le statut de la commande
  UPDATE public.orders 
  SET 
    status = new_status::text,
    approved_by = CASE WHEN new_status = 'approved' THEN user_id_param ELSE approved_by END,
    approved_at = CASE WHEN new_status = 'approved' THEN now() ELSE approved_at END
  WHERE id = order_id_param;
END;
$$;

-- Étape 7: Créer un trigger pour initialiser automatiquement le workflow
CREATE OR REPLACE FUNCTION public.auto_initialize_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Initialiser le workflow pour les nouvelles commandes
  PERFORM public.initialize_purchase_workflow(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_initialize_workflow
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_initialize_workflow();

-- Étape 8: Créer un trigger pour les notifications automatiques
CREATE OR REPLACE FUNCTION public.send_workflow_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  order_record RECORD;
  direction_users RECORD;
BEGIN
  -- Récupérer les détails de la commande
  SELECT o.*, p.name as requested_by_name 
  INTO order_record 
  FROM public.orders o
  LEFT JOIN public.profiles p ON p.id = o.requested_by
  WHERE o.id = NEW.order_id;
  
  -- Notifications pour les différentes étapes
  IF NEW.step_status = 'pending_approval' THEN
    -- Notifier tous les utilisateurs direction
    FOR direction_users IN 
      SELECT id FROM public.profiles WHERE role = 'direction'
    LOOP
      INSERT INTO public.workflow_notifications (
        order_id, recipient_user_id, notification_type, title, message
      ) VALUES (
        NEW.order_id,
        direction_users.id,
        'approval_required',
        'Nouvelle demande d''achat à approuver',
        'La demande ' || order_record.order_number || ' de ' || COALESCE(order_record.requested_by_name, 'Utilisateur inconnu') || ' nécessite votre approbation.'
      );
    END LOOP;
    
  ELSIF NEW.step_status = 'approved' THEN
    -- Notifier le demandeur
    IF order_record.requested_by IS NOT NULL THEN
      INSERT INTO public.workflow_notifications (
        order_id, recipient_user_id, notification_type, title, message
      ) VALUES (
        NEW.order_id,
        order_record.requested_by,
        'status_update',
        'Demande approuvée',
        'Votre demande ' || order_record.order_number || ' a été approuvée et est maintenant en recherche de fournisseurs.'
      );
    END IF;
    
  ELSIF NEW.step_status = 'received_scanned' THEN
    -- Notifier le demandeur
    IF order_record.requested_by IS NOT NULL THEN
      INSERT INTO public.workflow_notifications (
        order_id, recipient_user_id, notification_type, title, message
      ) VALUES (
        NEW.order_id,
        order_record.requested_by,
        'status_update',
        'Commande reçue',
        'Votre commande ' || order_record.order_number || ' a été reçue et scannée en stock.'
      );
    END IF;
    
  ELSIF NEW.step_status = 'rejected' THEN
    -- Notifier le demandeur
    IF order_record.requested_by IS NOT NULL THEN
      INSERT INTO public.workflow_notifications (
        order_id, recipient_user_id, notification_type, title, message
      ) VALUES (
        NEW.order_id,
        order_record.requested_by,
        'status_update',
        'Demande rejetée',
        'Votre demande ' || order_record.order_number || ' a été rejetée. Consultez les détails pour plus d''informations.'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_workflow_notifications
  AFTER INSERT ON public.purchase_workflow_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.send_workflow_notifications();

-- Étape 9: Créer une fonction pour l'intégration avec le module scan
CREATE OR REPLACE FUNCTION public.handle_scan_reception_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  order_record RECORD;
BEGIN
  -- Vérifier si c'est une réception de commande
  IF NEW.quantity_received > 0 THEN
    -- Chercher les commandes correspondantes
    FOR order_record IN 
      SELECT DISTINCT o.id 
      FROM public.orders o
      JOIN public.order_items oi ON oi.order_id = o.id
      JOIN public.logistics_receipts lr ON lr.base_id = o.base_id
      WHERE lr.id = NEW.receipt_id
        AND o.status IN ('shipping_antilles', 'order_confirmed')
        AND (
          LOWER(oi.product_name) = LOWER(NEW.product_name) 
          OR oi.reference = NEW.product_reference
        )
    LOOP
      -- Faire avancer le workflow automatiquement
      PERFORM public.advance_workflow_step(
        order_record.id,
        'received_scanned'::public.purchase_workflow_status,
        NEW.scanned_by,
        'Réception automatique via scan - Quantité: ' || NEW.quantity_received
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_scan_workflow_integration
  AFTER UPDATE ON public.logistics_receipt_items
  FOR EACH ROW
  WHEN (NEW.quantity_received > OLD.quantity_received)
  EXECUTE FUNCTION public.handle_scan_reception_workflow();

-- Étape 10: Créer les politiques RLS pour les nouvelles tables
ALTER TABLE public.purchase_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflow steps for their base orders" ON public.purchase_workflow_steps
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = purchase_workflow_steps.order_id 
    AND (
      get_user_role() = 'direction' 
      OR o.base_id = get_user_base_id() 
      OR o.requested_by = auth.uid()
    )
  )
);

CREATE POLICY "Direction and chef_base can manage workflow steps" ON public.purchase_workflow_steps
FOR ALL USING (
  get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role])
  AND EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = purchase_workflow_steps.order_id 
    AND (
      get_user_role() = 'direction' 
      OR o.base_id = get_user_base_id()
    )
  )
);

CREATE POLICY "Users can view their workflow notifications" ON public.workflow_notifications
FOR SELECT USING (recipient_user_id = auth.uid());

CREATE POLICY "System can insert workflow notifications" ON public.workflow_notifications
FOR INSERT WITH CHECK (true);

-- Étape 11: Migrer les données existantes
INSERT INTO public.purchase_workflow_steps (order_id, step_status, step_number, step_name, step_description, completed_at, auto_completed)
SELECT 
  id,
  CASE 
    WHEN status = 'pending_approval' THEN 'pending_approval'::public.purchase_workflow_status
    WHEN status = 'confirmed' AND is_purchase_request = true THEN 'approved'::public.purchase_workflow_status
    WHEN status = 'delivered' THEN 'completed'::public.purchase_workflow_status
    WHEN status = 'cancelled' THEN 'cancelled'::public.purchase_workflow_status
    ELSE 'supplier_search'::public.purchase_workflow_status
  END,
  CASE 
    WHEN status = 'pending_approval' THEN 1
    WHEN status = 'confirmed' AND is_purchase_request = true THEN 2
    WHEN status = 'delivered' THEN 7
    WHEN status = 'cancelled' THEN 98
    ELSE 3
  END,
  CASE 
    WHEN status = 'pending_approval' THEN 'En attente d''approbation'
    WHEN status = 'confirmed' AND is_purchase_request = true THEN 'Approuvé par direction'
    WHEN status = 'delivered' THEN 'Terminé'
    WHEN status = 'cancelled' THEN 'Annulé'
    ELSE 'Recherche de fournisseurs'
  END,
  CASE 
    WHEN status = 'pending_approval' THEN 'Demande en attente d''approbation'
    WHEN status = 'confirmed' AND is_purchase_request = true THEN 'Demande approuvée'
    WHEN status = 'delivered' THEN 'Processus terminé'
    WHEN status = 'cancelled' THEN 'Processus annulé'
    ELSE 'En cours de traitement'
  END,
  CASE 
    WHEN status IN ('delivered', 'cancelled') THEN now()
    ELSE NULL
  END,
  true
FROM public.orders 
WHERE created_at IS NOT NULL;