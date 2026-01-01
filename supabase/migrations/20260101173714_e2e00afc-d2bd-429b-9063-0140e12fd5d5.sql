-- Create table for supply request comments/notes
CREATE TABLE public.supply_request_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supply_request_id UUID NOT NULL REFERENCES public.supply_requests(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT NOT NULL,
  comment TEXT NOT NULL,
  status_at_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_supply_request_comments_request_id ON public.supply_request_comments(supply_request_id);
CREATE INDEX idx_supply_request_comments_created_at ON public.supply_request_comments(created_at DESC);

-- Enable RLS
ALTER TABLE public.supply_request_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view comments for requests in their base or if they're direction
CREATE POLICY "Users can view supply request comments"
ON public.supply_request_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.supply_requests sr
    WHERE sr.id = supply_request_id
    AND (
      sr.base_id = public.get_user_base_id()
      OR public.get_user_role() = 'direction'
    )
  )
);

-- Policy: Authenticated users can insert comments for requests they can access
CREATE POLICY "Users can add supply request comments"
ON public.supply_request_comments
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.supply_requests sr
    WHERE sr.id = supply_request_id
    AND (
      sr.base_id = public.get_user_base_id()
      OR public.get_user_role() IN ('direction', 'chef_base')
    )
  )
);

-- Policy: Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
ON public.supply_request_comments
FOR DELETE
USING (author_id = auth.uid());