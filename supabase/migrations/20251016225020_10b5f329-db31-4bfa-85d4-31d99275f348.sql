-- Add DELETE policies for supply_requests table

-- Policy 1: Direction can delete all supply requests
CREATE POLICY "Direction can delete all supply requests"
ON public.supply_requests
FOR DELETE
USING (has_role(auth.uid(), 'direction'::app_role));

-- Policy 2: Users can delete their own pending requests
CREATE POLICY "Users can delete their own pending requests"
ON public.supply_requests
FOR DELETE
USING (
  requested_by = auth.uid() 
  AND status = 'pending'
);

-- Policy 3: Chef base can delete pending requests in their base
CREATE POLICY "Chef base can delete pending requests in their base"
ON public.supply_requests
FOR DELETE
USING (
  has_role(auth.uid(), 'chef_base'::app_role)
  AND base_id = get_user_base_id()
  AND status = 'pending'
);