
DO $$
DECLARE
  r record;
  app_rpcs text[] := ARRAY[
    'has_role','has_page_permission','get_user_page_permissions','get_user_role',
    'get_user_base_id','is_channel_member','is_public_channel','can_complete_interventions',
    'delete_boat_cascade','delete_user_cascade','evaluate_weather_for_maintenance',
    'handle_one_way_checkin_transfer','handle_one_way_checkout_close',
    'handle_shipment_item_reception','link_stock_scan_to_order',
    'link_stock_scan_to_supply_request','add_order_items_to_stock',
    'process_workflow_automation','update_user_profile','resolve_workflow_alert',
    'mark_shipped','add_item_by_scan','receive_scan'
  ];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    IF r.proname = ANY (app_rpcs) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END IF;
  END LOOP;
END $$;
