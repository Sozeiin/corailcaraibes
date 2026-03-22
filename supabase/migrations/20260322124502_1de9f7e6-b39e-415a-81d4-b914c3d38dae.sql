-- Fix DORMELLE: set to rented (not available) so destination team can do check-out
UPDATE boats 
SET status = 'rented', 
    updated_at = now() 
WHERE id = 'b54420dc-e454-45a7-9e29-372fcae1beaf';

-- Create SECURITY DEFINER function for ONE WAY transfer at check-in
-- This bypasses RLS so technicians can transfer boats across bases
CREATE OR REPLACE FUNCTION public.handle_one_way_checkin_transfer(
  p_boat_id UUID,
  p_from_base_id UUID,
  p_to_base_id UUID,
  p_transferred_by UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Transfer boat to destination base, keep status as rented
  UPDATE boats
  SET base_id = p_to_base_id,
      status = 'rented',
      updated_at = now()
  WHERE id = p_boat_id;

  -- Record the transfer
  INSERT INTO boat_base_transfers (boat_id, from_base_id, to_base_id, reason, transferred_by)
  VALUES (
    p_boat_id,
    p_from_base_id,
    p_to_base_id,
    'Location ONE WAY - transfert automatique au check-in',
    p_transferred_by
  );
END;
$$;