-- Allow all authenticated users to view all bases for one-way rental destination selection
CREATE POLICY "Authenticated users can view all bases for selection"
ON public.bases
FOR SELECT
TO authenticated
USING (true);