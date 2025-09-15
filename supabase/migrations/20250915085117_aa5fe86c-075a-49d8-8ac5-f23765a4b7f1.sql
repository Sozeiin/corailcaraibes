-- Add 'distribution' to the page_permission enum type
ALTER TYPE page_permission ADD VALUE 'distribution';

-- Add 'link_stock_scan_to_supply_request' function if it doesn't exist
CREATE OR REPLACE FUNCTION link_stock_scan_to_supply_request(
  scan_data jsonb,
  supply_request_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- This is a placeholder function for linking stock scans to supply requests
  -- Add your business logic here
  result := jsonb_build_object(
    'success', true,
    'message', 'Stock scan linked to supply request successfully',
    'scan_data', scan_data,
    'supply_request_id', supply_request_id
  );
  
  RETURN result;
END;
$$;