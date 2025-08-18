-- Phase 5: Automatisation complète du workflow

-- 1. Table pour les règles d'automatisation
CREATE TABLE IF NOT EXISTS public.workflow_automation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_name TEXT NOT NULL,
  from_status public.purchase_workflow_status NOT NULL,
  to_status public.purchase_workflow_status NOT NULL,
  trigger_condition TEXT NOT NULL, -- 'time_based', 'external_event', 'manual_only'
  auto_delay_hours INTEGER DEFAULT 0, -- Délai automatique en heures
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Table pour les alertes d'étapes bloquées
CREATE TABLE IF NOT EXISTS public.workflow_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  step_status public.purchase_workflow_status NOT NULL,
  alert_type TEXT NOT NULL, -- 'stuck_step', 'overdue', 'approval_needed'
  threshold_hours INTEGER NOT NULL, -- Seuil en heures
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  alert_message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning', -- 'info', 'warning', 'error', 'critical'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Insérer les règles d'automatisation par défaut
INSERT INTO public.workflow_automation_rules (rule_name, from_status, to_status, trigger_condition, auto_delay_hours, requires_approval) VALUES
('Auto approve to supplier search', 'approved', 'supplier_search', 'time_based', 1, false),
('Auto confirm order after search', 'supplier_search', 'order_confirmed', 'manual_only', 0, true),
('Auto ship to antilles', 'order_confirmed', 'shipping_antilles', 'time_based', 24, false),
('Auto complete on scan', 'received_scanned', 'completed', 'time_based', 1, false);

-- 4. Enable RLS
ALTER TABLE public.workflow_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_alerts ENABLE ROW LEVEL SECURITY;

-- 5. Politiques RLS pour les règles d'automatisation
CREATE POLICY "Direction can manage automation rules" 
ON public.workflow_automation_rules 
FOR ALL 
USING (get_user_role() = 'direction');

CREATE POLICY "Chef de base can view automation rules" 
ON public.workflow_automation_rules 
FOR SELECT 
USING (get_user_role() = ANY(ARRAY['direction'::user_role, 'chef_base'::user_role]));

-- 6. Politiques RLS pour les alertes
CREATE POLICY "Direction and chef_base can manage alerts" 
ON public.workflow_alerts 
FOR ALL 
USING (
  get_user_role() = ANY(ARRAY['direction'::user_role, 'chef_base'::user_role])
  AND (
    get_user_role() = 'direction' 
    OR EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = workflow_alerts.order_id 
      AND o.base_id = get_user_base_id()
    )
  )
);

CREATE POLICY "Users can view alerts for their orders" 
ON public.workflow_alerts 
FOR SELECT 
USING (
  get_user_role() = 'direction' 
  OR EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = workflow_alerts.order_id 
    AND (o.base_id = get_user_base_id() OR o.requested_by = auth.uid())
  )
);

-- 7. Fonction améliorée pour l'automatisation des étapes
CREATE OR REPLACE FUNCTION public.process_workflow_automation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rule_record RECORD;
  step_record RECORD;
  stuck_step_record RECORD;
BEGIN
  -- Traiter les règles d'automatisation basées sur le temps
  FOR rule_record IN 
    SELECT * FROM public.workflow_automation_rules 
    WHERE is_active = true 
    AND trigger_condition = 'time_based'
  LOOP
    -- Trouver les étapes éligibles pour cette règle
    FOR step_record IN
      SELECT pws.*, o.id as order_id
      FROM public.purchase_workflow_steps pws
      JOIN public.orders o ON o.id = pws.order_id
      WHERE pws.step_status = rule_record.from_status
      AND pws.completed_at IS NULL
      AND pws.started_at <= (now() - (rule_record.auto_delay_hours || ' hours')::interval)
      AND NOT EXISTS (
        SELECT 1 FROM public.purchase_workflow_steps pws2 
        WHERE pws2.order_id = pws.order_id 
        AND pws2.step_status = rule_record.to_status
      )
    LOOP
      -- Avancer automatiquement l'étape
      PERFORM public.advance_workflow_step(
        step_record.order_id,
        rule_record.to_status,
        NULL, -- système automatique
        'Transition automatique après ' || rule_record.auto_delay_hours || ' heures'
      );
      
      -- Log de l'automatisation
      INSERT INTO public.workflow_notifications (
        order_id, recipient_user_id, notification_type, title, message
      )
      SELECT 
        step_record.order_id,
        p.id,
        'automation_update',
        'Étape avancée automatiquement',
        'La commande a automatiquement progressé de "' || rule_record.from_status || '" vers "' || rule_record.to_status || '"'
      FROM public.profiles p
      WHERE p.role = 'direction';
    END LOOP;
  END LOOP;
  
  -- Détecter les étapes bloquées et créer des alertes
  FOR stuck_step_record IN
    SELECT pws.*, o.order_number, o.base_id
    FROM public.purchase_workflow_steps pws
    JOIN public.orders o ON o.id = pws.order_id
    WHERE pws.completed_at IS NULL
    AND pws.step_status NOT IN ('completed', 'rejected', 'cancelled')
    AND pws.started_at <= (now() - '24 hours'::interval) -- Bloqué depuis plus de 24h
    AND NOT EXISTS (
      SELECT 1 FROM public.workflow_alerts wa 
      WHERE wa.order_id = pws.order_id 
      AND wa.step_status = pws.step_status 
      AND wa.is_resolved = false
    )
  LOOP
    -- Créer une alerte pour l'étape bloquée
    INSERT INTO public.workflow_alerts (
      order_id, step_status, alert_type, threshold_hours, 
      alert_message, severity
    ) VALUES (
      stuck_step_record.order_id,
      stuck_step_record.step_status,
      'stuck_step',
      24,
      'La commande ' || stuck_step_record.order_number || ' est bloquée à l''étape "' || stuck_step_record.step_name || '" depuis plus de 24 heures',
      CASE 
        WHEN stuck_step_record.started_at <= (now() - '72 hours'::interval) THEN 'critical'
        WHEN stuck_step_record.started_at <= (now() - '48 hours'::interval) THEN 'error'
        ELSE 'warning'
      END
    );
    
    -- Notifier la direction
    INSERT INTO public.workflow_notifications (
      order_id, recipient_user_id, notification_type, title, message
    )
    SELECT 
      stuck_step_record.order_id,
      p.id,
      'stuck_alert',
      'Commande bloquée - Action requise',
      'La commande ' || stuck_step_record.order_number || ' nécessite votre attention'
    FROM public.profiles p
    WHERE p.role = 'direction';
  END LOOP;
  
  -- Détecter les demandes d'approbation en attente depuis plus de 48h
  FOR stuck_step_record IN
    SELECT pws.*, o.order_number
    FROM public.purchase_workflow_steps pws
    JOIN public.orders o ON o.id = pws.order_id
    WHERE pws.step_status = 'pending_approval'
    AND pws.completed_at IS NULL
    AND pws.started_at <= (now() - '48 hours'::interval)
    AND NOT EXISTS (
      SELECT 1 FROM public.workflow_alerts wa 
      WHERE wa.order_id = pws.order_id 
      AND wa.alert_type = 'approval_needed' 
      AND wa.is_resolved = false
    )
  LOOP
    INSERT INTO public.workflow_alerts (
      order_id, step_status, alert_type, threshold_hours,
      alert_message, severity
    ) VALUES (
      stuck_step_record.order_id,
      'pending_approval',
      'approval_needed',
      48,
      'Demande d''approbation en attente depuis plus de 48h pour la commande ' || stuck_step_record.order_number,
      'error'
    );
    
    -- Notification urgente à la direction
    INSERT INTO public.workflow_notifications (
      order_id, recipient_user_id, notification_type, title, message
    )
    SELECT 
      stuck_step_record.order_id,
      p.id,
      'urgent_approval',
      '🚨 Approbation urgente requise',
      'La commande ' || stuck_step_record.order_number || ' attend votre approbation depuis plus de 48 heures'
    FROM public.profiles p
    WHERE p.role = 'direction';
  END LOOP;
END;
$$;

-- 8. Fonction améliorée pour résoudre les alertes
CREATE OR REPLACE FUNCTION public.resolve_workflow_alert(alert_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.workflow_alerts 
  SET 
    is_resolved = true,
    resolved_at = now()
  WHERE id = alert_id_param;
END;
$$;

-- 9. Trigger pour l'automatisation après changement de statut
CREATE OR REPLACE FUNCTION public.trigger_workflow_automation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Marquer les alertes comme résolues quand une étape progresse
  UPDATE public.workflow_alerts 
  SET 
    is_resolved = true,
    resolved_at = now()
  WHERE order_id = NEW.order_id 
  AND step_status = OLD.step_status
  AND is_resolved = false;
  
  -- Déclencher l'automatisation immédiate si applicable
  PERFORM public.process_workflow_automation();
  
  RETURN NEW;
END;
$$;

-- 10. Attacher le trigger aux mises à jour de workflow
DROP TRIGGER IF EXISTS workflow_automation_trigger ON public.purchase_workflow_steps;
CREATE TRIGGER workflow_automation_trigger
  AFTER UPDATE ON public.purchase_workflow_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_workflow_automation();

-- 11. Améliorer la fonction de scan pour automation
CREATE OR REPLACE FUNCTION public.handle_scan_reception_workflow_enhanced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  order_record RECORD;
BEGIN
  -- Vérifier si c'est une réception de commande
  IF NEW.quantity_received > 0 THEN
    -- Chercher les commandes correspondantes avec plus de précision
    FOR order_record IN 
      SELECT DISTINCT o.id, o.order_number
      FROM public.orders o
      JOIN public.order_items oi ON oi.order_id = o.id
      JOIN public.logistics_receipts lr ON lr.base_id = o.base_id
      WHERE lr.id = NEW.receipt_id
        AND o.status IN ('shipping_antilles', 'order_confirmed')
        AND (
          LOWER(TRIM(oi.product_name)) = LOWER(TRIM(NEW.product_name))
          OR LOWER(TRIM(oi.reference)) = LOWER(TRIM(NEW.product_reference))
          OR similarity(oi.product_name, NEW.product_name) > 0.8
        )
    LOOP
      -- Faire avancer le workflow automatiquement
      PERFORM public.advance_workflow_step(
        order_record.id,
        'received_scanned'::public.purchase_workflow_status,
        NEW.scanned_by,
        'Réception automatique via scan - Article: ' || NEW.product_name || ' - Quantité: ' || NEW.quantity_received
      );
      
      -- Créer une notification de réception automatique
      INSERT INTO public.workflow_notifications (
        order_id, recipient_user_id, notification_type, title, message
      )
      SELECT 
        order_record.id,
        o.requested_by,
        'auto_reception',
        '📦 Réception automatique confirmée',
        'Votre commande ' || order_record.order_number || ' a été automatiquement marquée comme reçue suite au scan'
      FROM public.orders o
      WHERE o.id = order_record.id AND o.requested_by IS NOT NULL;
      
      -- Résoudre les alertes liées à cette commande
      UPDATE public.workflow_alerts 
      SET is_resolved = true, resolved_at = now()
      WHERE order_id = order_record.id AND is_resolved = false;
      
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 12. Remplacer l'ancien trigger de scan
DROP TRIGGER IF EXISTS scan_reception_workflow_trigger ON public.logistics_receipt_items;
CREATE TRIGGER scan_reception_workflow_enhanced_trigger
  AFTER INSERT OR UPDATE ON public.logistics_receipt_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_scan_reception_workflow_enhanced();

-- 13. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_workflow_steps_status_date ON public.purchase_workflow_steps(step_status, started_at) WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_alerts_unresolved ON public.workflow_alerts(order_id, is_resolved) WHERE is_resolved = false;
CREATE INDEX IF NOT EXISTS idx_automation_rules_active ON public.workflow_automation_rules(from_status, to_status, is_active) WHERE is_active = true;