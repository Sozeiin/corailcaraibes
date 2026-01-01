-- =====================================================
-- Complete FK cleanup: recreate all references to profiles(id) with ON DELETE SET NULL/CASCADE
-- Fix NOT NULL columns that need to become nullable
-- =====================================================

-- 1) administrative_checkin_forms.created_by (NOT NULL -> nullable)
ALTER TABLE public.administrative_checkin_forms
  ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.administrative_checkin_forms
  DROP CONSTRAINT IF EXISTS administrative_checkin_forms_created_by_fkey;
ALTER TABLE public.administrative_checkin_forms
  ADD CONSTRAINT administrative_checkin_forms_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2) boat_checklists.technician_id (already nullable, recreate FK)
ALTER TABLE public.boat_checklists
  DROP CONSTRAINT IF EXISTS boat_checklists_technician_id_fkey;
ALTER TABLE public.boat_checklists
  ADD CONSTRAINT boat_checklists_technician_id_fkey
  FOREIGN KEY (technician_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3) boat_preparation_checklists.technician_id
ALTER TABLE public.boat_preparation_checklists
  DROP CONSTRAINT IF EXISTS boat_preparation_checklists_technician_id_fkey;
ALTER TABLE public.boat_preparation_checklists
  ADD CONSTRAINT boat_preparation_checklists_technician_id_fkey
  FOREIGN KEY (technician_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4) boat_safety_controls.performed_by
ALTER TABLE public.boat_safety_controls
  DROP CONSTRAINT IF EXISTS boat_safety_controls_performed_by_fkey;
ALTER TABLE public.boat_safety_controls
  ADD CONSTRAINT boat_safety_controls_performed_by_fkey
  FOREIGN KEY (performed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 5) boat_safety_controls.validated_by
ALTER TABLE public.boat_safety_controls
  DROP CONSTRAINT IF EXISTS boat_safety_controls_validated_by_fkey;
ALTER TABLE public.boat_safety_controls
  ADD CONSTRAINT boat_safety_controls_validated_by_fkey
  FOREIGN KEY (validated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 6) bulk_purchase_campaigns.created_by (NOT NULL -> nullable)
ALTER TABLE public.bulk_purchase_campaigns
  ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.bulk_purchase_campaigns
  DROP CONSTRAINT IF EXISTS bulk_purchase_campaigns_created_by_fkey;
ALTER TABLE public.bulk_purchase_campaigns
  ADD CONSTRAINT bulk_purchase_campaigns_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 7) bulk_purchase_templates.created_by
ALTER TABLE public.bulk_purchase_templates
  DROP CONSTRAINT IF EXISTS bulk_purchase_templates_created_by_fkey;
ALTER TABLE public.bulk_purchase_templates
  ADD CONSTRAINT bulk_purchase_templates_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 8) channel_members.user_id (CASCADE - delete membership)
ALTER TABLE public.channel_members
  DROP CONSTRAINT IF EXISTS channel_members_user_id_fkey;
ALTER TABLE public.channel_members
  ADD CONSTRAINT channel_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 9) channels.created_by
ALTER TABLE public.channels
  DROP CONSTRAINT IF EXISTS channels_created_by_fkey;
ALTER TABLE public.channels
  ADD CONSTRAINT channels_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 10) checkin_checkout_orders.created_by (NOT NULL -> nullable)
ALTER TABLE public.checkin_checkout_orders
  ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.checkin_checkout_orders
  DROP CONSTRAINT IF EXISTS checkin_checkout_orders_created_by_fkey;
ALTER TABLE public.checkin_checkout_orders
  ADD CONSTRAINT checkin_checkout_orders_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 11) checkin_checkout_orders.technician_id
ALTER TABLE public.checkin_checkout_orders
  DROP CONSTRAINT IF EXISTS checkin_checkout_orders_technician_id_fkey;
ALTER TABLE public.checkin_checkout_orders
  ADD CONSTRAINT checkin_checkout_orders_technician_id_fkey
  FOREIGN KEY (technician_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 12) customers.created_by
ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_created_by_fkey;
ALTER TABLE public.customers
  ADD CONSTRAINT customers_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 13) dashboard_preferences.user_id (CASCADE)
ALTER TABLE public.dashboard_preferences
  DROP CONSTRAINT IF EXISTS dashboard_preferences_user_id_fkey;
ALTER TABLE public.dashboard_preferences
  ADD CONSTRAINT dashboard_preferences_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 14) interventions.created_by
ALTER TABLE public.interventions
  DROP CONSTRAINT IF EXISTS interventions_created_by_fkey;
ALTER TABLE public.interventions
  ADD CONSTRAINT interventions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 15) interventions.technician_id
ALTER TABLE public.interventions
  DROP CONSTRAINT IF EXISTS interventions_technician_id_fkey;
ALTER TABLE public.interventions
  ADD CONSTRAINT interventions_technician_id_fkey
  FOREIGN KEY (technician_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 16) maintenance_manuals.created_by
ALTER TABLE public.maintenance_manuals
  DROP CONSTRAINT IF EXISTS maintenance_manuals_created_by_fkey;
ALTER TABLE public.maintenance_manuals
  ADD CONSTRAINT maintenance_manuals_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 17) maintenance_tasks.assigned_to
ALTER TABLE public.maintenance_tasks
  DROP CONSTRAINT IF EXISTS maintenance_tasks_assigned_to_fkey;
ALTER TABLE public.maintenance_tasks
  ADD CONSTRAINT maintenance_tasks_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 18) messages.author_id (NOT NULL -> nullable)
ALTER TABLE public.messages
  ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_author_id_fkey;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 19) notifications.user_id (CASCADE)
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 20) orders.approved_by
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_approved_by_fkey;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 21) orders.requested_by
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_requested_by_fkey;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_requested_by_fkey
  FOREIGN KEY (requested_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 22) planning_activities.technician_id
ALTER TABLE public.planning_activities
  DROP CONSTRAINT IF EXISTS planning_activities_technician_id_fkey;
ALTER TABLE public.planning_activities
  ADD CONSTRAINT planning_activities_technician_id_fkey
  FOREIGN KEY (technician_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 23) planning_templates.created_by
ALTER TABLE public.planning_templates
  DROP CONSTRAINT IF EXISTS planning_templates_created_by_fkey;
ALTER TABLE public.planning_templates
  ADD CONSTRAINT planning_templates_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 24) preparation_checklist_templates.created_by
ALTER TABLE public.preparation_checklist_templates
  DROP CONSTRAINT IF EXISTS preparation_checklist_templates_created_by_fkey;
ALTER TABLE public.preparation_checklist_templates
  ADD CONSTRAINT preparation_checklist_templates_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 25) purchasing_templates.created_by (NOT NULL -> nullable)
ALTER TABLE public.purchasing_templates
  ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.purchasing_templates
  DROP CONSTRAINT IF EXISTS purchasing_templates_created_by_fkey;
ALTER TABLE public.purchasing_templates
  ADD CONSTRAINT purchasing_templates_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 26) push_subscriptions.user_id (CASCADE)
ALTER TABLE public.push_subscriptions
  DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_fkey;
ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 27) response_templates.created_by
ALTER TABLE public.response_templates
  DROP CONSTRAINT IF EXISTS response_templates_created_by_fkey;
ALTER TABLE public.response_templates
  ADD CONSTRAINT response_templates_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 28) shipment_preparations.created_by (NOT NULL -> nullable)
ALTER TABLE public.shipment_preparations
  ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.shipment_preparations
  DROP CONSTRAINT IF EXISTS shipment_preparations_created_by_fkey;
ALTER TABLE public.shipment_preparations
  ADD CONSTRAINT shipment_preparations_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 29) stock_item_quotes.requested_by
ALTER TABLE public.stock_item_quotes
  DROP CONSTRAINT IF EXISTS stock_item_quotes_requested_by_fkey;
ALTER TABLE public.stock_item_quotes
  ADD CONSTRAINT stock_item_quotes_requested_by_fkey
  FOREIGN KEY (requested_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 30) supplier_contracts.created_by (NOT NULL -> nullable)
ALTER TABLE public.supplier_contracts
  ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.supplier_contracts
  DROP CONSTRAINT IF EXISTS supplier_contracts_created_by_fkey;
ALTER TABLE public.supplier_contracts
  ADD CONSTRAINT supplier_contracts_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 31) supplier_interactions.user_id (CASCADE)
ALTER TABLE public.supplier_interactions
  DROP CONSTRAINT IF EXISTS supplier_interactions_user_id_fkey;
ALTER TABLE public.supplier_interactions
  ADD CONSTRAINT supplier_interactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 32) supply_requests.requested_by (NOT NULL -> nullable)
ALTER TABLE public.supply_requests
  ALTER COLUMN requested_by DROP NOT NULL;
ALTER TABLE public.supply_requests
  DROP CONSTRAINT IF EXISTS supply_requests_requested_by_fkey;
ALTER TABLE public.supply_requests
  ADD CONSTRAINT supply_requests_requested_by_fkey
  FOREIGN KEY (requested_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 33) supply_requests.validated_by
ALTER TABLE public.supply_requests
  DROP CONSTRAINT IF EXISTS supply_requests_validated_by_fkey;
ALTER TABLE public.supply_requests
  ADD CONSTRAINT supply_requests_validated_by_fkey
  FOREIGN KEY (validated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 34) thread_assignments.user_id (CASCADE)
ALTER TABLE public.thread_assignments
  DROP CONSTRAINT IF EXISTS thread_assignments_user_id_fkey;
ALTER TABLE public.thread_assignments
  ADD CONSTRAINT thread_assignments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 35) topics.created_by (NOT NULL -> nullable)
ALTER TABLE public.topics
  ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.topics
  DROP CONSTRAINT IF EXISTS topics_created_by_fkey;
ALTER TABLE public.topics
  ADD CONSTRAINT topics_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 36) topics.assigned_to
ALTER TABLE public.topics
  DROP CONSTRAINT IF EXISTS topics_assigned_to_fkey;
ALTER TABLE public.topics
  ADD CONSTRAINT topics_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 37) user_permissions.user_id (CASCADE)
ALTER TABLE public.user_permissions
  DROP CONSTRAINT IF EXISTS user_permissions_user_id_fkey;
ALTER TABLE public.user_permissions
  ADD CONSTRAINT user_permissions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;