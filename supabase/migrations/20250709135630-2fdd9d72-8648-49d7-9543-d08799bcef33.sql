-- Update the purchase-requests bucket to be public
UPDATE storage.buckets SET public = true WHERE id = 'purchase-requests';

-- Create policies for the purchase-requests bucket
CREATE POLICY "Purchase request images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'purchase-requests');

CREATE POLICY "Users can upload purchase request images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'purchase-requests' AND auth.uid() = (storage.foldername(name))[1]::uuid);

CREATE POLICY "Users can update their own purchase request images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'purchase-requests' AND auth.uid() = (storage.foldername(name))[1]::uuid);

CREATE POLICY "Users can delete their own purchase request images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'purchase-requests' AND auth.uid() = (storage.foldername(name))[1]::uuid);