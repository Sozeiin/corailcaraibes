-- Reconfigure FKs referencing auth.users to ON DELETE SET NULL so user deletion no longer blocks

ALTER TABLE public.administrative_checkin_forms DROP CONSTRAINT administrative_checkin_forms_used_by_fkey;
ALTER TABLE public.administrative_checkin_forms ADD CONSTRAINT administrative_checkin_forms_used_by_fkey FOREIGN KEY (used_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.api_logs DROP CONSTRAINT api_logs_user_id_fkey;
ALTER TABLE public.api_logs ADD CONSTRAINT api_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.boat_base_transfers DROP CONSTRAINT boat_base_transfers_transferred_by_fkey;
ALTER TABLE public.boat_base_transfers ADD CONSTRAINT boat_base_transfers_transferred_by_fkey FOREIGN KEY (transferred_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.boat_documents DROP CONSTRAINT boat_documents_uploaded_by_fkey;
ALTER TABLE public.boat_documents ADD CONSTRAINT boat_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.planning_activities DROP CONSTRAINT planning_activities_planned_by_fkey;
ALTER TABLE public.planning_activities ADD CONSTRAINT planning_activities_planned_by_fkey FOREIGN KEY (planned_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.security_events DROP CONSTRAINT security_events_user_id_fkey;
ALTER TABLE public.security_events ADD CONSTRAINT security_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.smart_thread_entities DROP CONSTRAINT smart_thread_entities_linked_by_fkey;
ALTER TABLE public.smart_thread_entities ADD CONSTRAINT smart_thread_entities_linked_by_fkey FOREIGN KEY (linked_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.stock_reservations DROP CONSTRAINT stock_reservations_reserved_by_fkey;
ALTER TABLE public.stock_reservations ADD CONSTRAINT stock_reservations_reserved_by_fkey FOREIGN KEY (reserved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.supply_request_comments DROP CONSTRAINT supply_request_comments_author_id_fkey;
ALTER TABLE public.supply_request_comments ADD CONSTRAINT supply_request_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.thread_assignments DROP CONSTRAINT thread_assignments_assigned_by_fkey;
ALTER TABLE public.thread_assignments ADD CONSTRAINT thread_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.thread_workflow_states DROP CONSTRAINT thread_workflow_states_assigned_to_fkey;
ALTER TABLE public.thread_workflow_states ADD CONSTRAINT thread_workflow_states_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.thread_workflow_states DROP CONSTRAINT thread_workflow_states_resolved_by_fkey;
ALTER TABLE public.thread_workflow_states ADD CONSTRAINT thread_workflow_states_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.user_permissions DROP CONSTRAINT user_permissions_granted_by_fkey;
ALTER TABLE public.user_permissions ADD CONSTRAINT user_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_assigned_by_fkey;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL;