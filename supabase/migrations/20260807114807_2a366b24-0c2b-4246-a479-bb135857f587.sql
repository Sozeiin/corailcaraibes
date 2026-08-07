
-- 1. administrative_checkin_forms: remove public read
DROP POLICY IF EXISTS "Enable read access for all users" ON public.administrative_checkin_forms;

-- 2. boat_preparation_checklists: remove public read
DROP POLICY IF EXISTS "Enable read access for all users" ON public.boat_preparation_checklists;

-- 3. checkin_drafts: scope policies
DROP POLICY IF EXISTS "Authenticated users can read drafts" ON public.checkin_drafts;
DROP POLICY IF EXISTS "Authenticated users can insert drafts" ON public.checkin_drafts;
DROP POLICY IF EXISTS "Authenticated users can update drafts" ON public.checkin_drafts;
DROP POLICY IF EXISTS "Authenticated users can delete drafts" ON public.checkin_drafts;

CREATE POLICY "Users can read drafts of their base"
ON public.checkin_drafts FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR updated_by = auth.uid()
  OR public.get_user_role() = 'direction'::user_role
  OR EXISTS (
    SELECT 1 FROM public.boats b
    WHERE b.id = checkin_drafts.boat_id AND b.base_id = public.get_user_base_id()
  )
);

CREATE POLICY "Users can insert their own drafts"
ON public.checkin_drafts FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update drafts of their base"
ON public.checkin_drafts FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR updated_by = auth.uid()
  OR public.get_user_role() = 'direction'::user_role
  OR EXISTS (
    SELECT 1 FROM public.boats b
    WHERE b.id = checkin_drafts.boat_id AND b.base_id = public.get_user_base_id()
  )
)
WITH CHECK (updated_by = auth.uid() OR public.get_user_role() = 'direction'::user_role);

CREATE POLICY "Users can delete drafts of their base"
ON public.checkin_drafts FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  OR updated_by = auth.uid()
  OR public.get_user_role() = 'direction'::user_role
  OR EXISTS (
    SELECT 1 FROM public.boats b
    WHERE b.id = checkin_drafts.boat_id AND b.base_id = public.get_user_base_id()
  )
);

-- 4. profiles: remove blanket read, scope to own base / shared channels
DROP POLICY IF EXISTS "Users can view basic profile info for messaging" ON public.profiles;

CREATE POLICY "Users can view profiles of their base or shared channels"
ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR base_id = public.get_user_base_id()
  OR EXISTS (
    SELECT 1
    FROM public.channel_members cm_self
    JOIN public.channel_members cm_other ON cm_other.channel_id = cm_self.channel_id
    WHERE cm_self.user_id = auth.uid() AND cm_other.user_id = profiles.id
  )
);

-- 5. storage: checklist photos - drop over-permissive & broken-logic policies
DROP POLICY IF EXISTS "checklist_photos_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "checklist_photos_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "checklist_photos_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "checklist_photos_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "Users can view checklist photos for their base" ON storage.objects;
DROP POLICY IF EXISTS "Users can update checklist photos for their base" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete checklist photos for their base" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload checklist photos for their base" ON storage.objects;

-- Correct logic: the first path segment is the boat_checklists id (or 'temp')
CREATE POLICY "Checklist photos readable by their base"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'checklist-photos'
  AND (
    public.get_user_role() = 'direction'::user_role
    OR EXISTS (
      SELECT 1 FROM public.boat_checklists bc
      JOIN public.boats b ON b.id = bc.boat_id
      WHERE b.base_id = public.get_user_base_id()
        AND bc.id::text = split_part(storage.objects.name, '/', 1)
    )
  )
);

CREATE POLICY "Checklist photos uploadable by authenticated staff"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'checklist-photos'
  AND public.get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role, 'technicien'::user_role, 'administratif'::user_role])
);

CREATE POLICY "Checklist photos updatable by their base"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'checklist-photos'
  AND (
    public.get_user_role() = 'direction'::user_role
    OR EXISTS (
      SELECT 1 FROM public.boat_checklists bc
      JOIN public.boats b ON b.id = bc.boat_id
      WHERE b.base_id = public.get_user_base_id()
        AND bc.id::text = split_part(storage.objects.name, '/', 1)
    )
    OR split_part(storage.objects.name, '/', 1) = 'temp'
  )
);

CREATE POLICY "Checklist photos deletable by their base"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'checklist-photos'
  AND (
    public.get_user_role() = 'direction'::user_role
    OR EXISTS (
      SELECT 1 FROM public.boat_checklists bc
      JOIN public.boats b ON b.id = bc.boat_id
      WHERE b.base_id = public.get_user_base_id()
        AND bc.id::text = split_part(storage.objects.name, '/', 1)
    )
    OR split_part(storage.objects.name, '/', 1) = 'temp'
  )
);

-- 6. storage: stock photos - restrict update/delete to privileged staff
DROP POLICY IF EXISTS "Users can update stock photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete stock photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload stock photos" ON storage.objects;

CREATE POLICY "Staff can upload stock photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'stock-photos'
  AND public.get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role, 'administratif'::user_role, 'technicien'::user_role])
);

CREATE POLICY "Privileged staff can update stock photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'stock-photos'
  AND public.get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role, 'administratif'::user_role])
);

CREATE POLICY "Privileged staff can delete stock photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'stock-photos'
  AND public.get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role, 'administratif'::user_role])
);

-- 7. storage: purchase-requests - scope to authenticated only
DROP POLICY IF EXISTS "Authenticated users can update purchase request attachments" ON storage.objects;
CREATE POLICY "Users can update their own purchase request attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'purchase-requests'
  AND ((auth.uid())::text = (storage.foldername(name))[1] OR public.get_user_role() = 'direction'::user_role)
);

-- 8. Restrict remaining storage policies to authenticated role only
DROP POLICY IF EXISTS "Direction can view all reports" ON storage.objects;
CREATE POLICY "Direction can view all reports"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'reports' AND public.get_user_role() = 'direction'::user_role);

DROP POLICY IF EXISTS "Direction can view all signatures" ON storage.objects;
CREATE POLICY "Direction can view all signatures"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'signatures' AND public.get_user_role() = 'direction'::user_role);

DROP POLICY IF EXISTS "Users can view their own reports" ON storage.objects;
CREATE POLICY "Users can view their own reports"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'reports' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can upload reports" ON storage.objects;
CREATE POLICY "Users can upload reports"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'reports' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view their own signatures" ON storage.objects;
CREATE POLICY "Users can view their own signatures"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'signatures' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can upload their own signatures" ON storage.objects;
CREATE POLICY "Users can upload their own signatures"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'signatures' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view boat documents for their base" ON storage.objects;
CREATE POLICY "Users can view boat documents for their base"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'boat-documents'
  AND (
    public.get_user_role() = 'direction'::user_role
    OR EXISTS (
      SELECT 1 FROM public.boat_documents bd
      JOIN public.boats b ON b.id = bd.boat_id
      WHERE bd.storage_path = storage.objects.name AND b.base_id = public.get_user_base_id()
    )
  )
);

DROP POLICY IF EXISTS "Users can update their base boat documents" ON storage.objects;
CREATE POLICY "Users can update their base boat documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'boat-documents'
  AND (
    public.get_user_role() = 'direction'::user_role
    OR EXISTS (
      SELECT 1 FROM public.boat_documents bd
      JOIN public.boats b ON b.id = bd.boat_id
      WHERE bd.storage_path = storage.objects.name AND b.base_id = public.get_user_base_id()
    )
  )
);

DROP POLICY IF EXISTS "Users can delete their base boat documents" ON storage.objects;
CREATE POLICY "Users can delete their base boat documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'boat-documents'
  AND (
    public.get_user_role() = 'direction'::user_role
    OR EXISTS (
      SELECT 1 FROM public.boat_documents bd
      JOIN public.boats b ON b.id = bd.boat_id
      WHERE bd.storage_path = storage.objects.name AND b.base_id = public.get_user_base_id()
    )
  )
);

DROP POLICY IF EXISTS "Direction, chef_base and technicians can upload boat documents" ON storage.objects;
CREATE POLICY "Staff can upload boat documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'boat-documents'
  AND public.get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role, 'technicien'::user_role])
);

DROP POLICY IF EXISTS "Users can view purchase request photos" ON storage.objects;
CREATE POLICY "Users can view purchase request photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'purchase-requests'
  AND ((auth.uid())::text = (storage.foldername(name))[1] OR public.get_user_role() = 'direction'::user_role)
);

DROP POLICY IF EXISTS "Users can upload purchase request photos" ON storage.objects;
CREATE POLICY "Users can upload purchase request photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'purchase-requests' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their purchase request photos" ON storage.objects;
CREATE POLICY "Users can delete their purchase request photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'purchase-requests' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can upload purchase request images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own purchase request images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own purchase request images" ON storage.objects;

-- 9. Views: enforce querying user's permissions
ALTER VIEW public.boat_complete_history SET (security_invoker = true);
ALTER VIEW public.bases_public SET (security_invoker = true);
ALTER VIEW public.thread_entities_detailed SET (security_invoker = true);

-- 10. Materialized view not exposed through the Data API
REVOKE ALL ON public.purchasing_analytics FROM anon, authenticated;

-- 11. Fix mutable search_path on SECURITY DEFINER functions
ALTER FUNCTION public.simple_stock_update() SET search_path = public;
ALTER FUNCTION public.initialize_purchase_workflow(uuid) SET search_path = public;
ALTER FUNCTION public.create_stock_item_from_component() SET search_path = public;
ALTER FUNCTION public.auto_initialize_workflow() SET search_path = public;
ALTER FUNCTION public.send_workflow_notifications() SET search_path = public;
ALTER FUNCTION public.handle_scan_reception_workflow() SET search_path = public;
ALTER FUNCTION public.resolve_workflow_alert(uuid) SET search_path = public;
ALTER FUNCTION public.trigger_workflow_automation() SET search_path = public;
ALTER FUNCTION public.handle_scan_reception_workflow_enhanced() SET search_path = public;
ALTER FUNCTION public.handle_supply_request_completion() SET search_path = public;
ALTER FUNCTION public.check_shipment_completion() SET search_path = public;
ALTER FUNCTION public.handle_stock_scan_workflow() SET search_path = public;
ALTER FUNCTION public.sync_order_to_stock_and_history() SET search_path = public;
ALTER FUNCTION public.activate_one_way_sharing() SET search_path = public;
ALTER FUNCTION public.link_stock_scan_to_supply_request(uuid, uuid, integer) SET search_path = public;
ALTER FUNCTION public.link_stock_scan_to_supply_request(jsonb, uuid) SET search_path = public;
ALTER FUNCTION public.link_stock_scan_to_order(uuid, uuid, integer) SET search_path = public;

-- 12. Revoke EXECUTE on trigger + privileged functions from API roles
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND (
        pg_get_function_result(p.oid) = 'trigger'
        OR p.proname IN (
          'delete_user_cascade','delete_boat_cascade','cleanup_old_logs',
          'cleanup_inactive_subscriptions','process_workflow_automation',
          'refresh_purchasing_analytics','initialize_purchase_workflow',
          'handle_one_way_checkin_transfer','handle_one_way_checkout_close',
          'add_order_items_to_stock','handle_shipment_item_reception'
        )
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon, authenticated', r.sig);
  END LOOP;
END $$;

-- Remaining SECURITY DEFINER helpers/RPCs used by the app: keep for authenticated, deny anon
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
  END LOOP;
END $$;
