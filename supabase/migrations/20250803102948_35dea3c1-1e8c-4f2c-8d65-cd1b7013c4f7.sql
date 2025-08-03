-- Create storage policies for signatures bucket
-- Allow authenticated users to upload their own signatures
CREATE POLICY "Users can upload their own signatures" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'signatures' 
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to view their own signatures
CREATE POLICY "Users can view their own signatures" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (
  bucket_id = 'signatures' 
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to update their own signatures
CREATE POLICY "Users can update their own signatures" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'signatures' 
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to delete their own signatures  
CREATE POLICY "Users can delete their own signatures" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'signatures' 
  AND auth.uid() IS NOT NULL
);