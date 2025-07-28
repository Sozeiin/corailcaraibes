-- Add photo_url column to stock_items table
ALTER TABLE public.stock_items 
ADD COLUMN photo_url text;

-- Create storage bucket for stock photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('stock-photos', 'stock-photos', true);

-- Create storage policies for stock photos
CREATE POLICY "Stock photos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'stock-photos');

CREATE POLICY "Users can upload stock photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'stock-photos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update stock photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'stock-photos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete stock photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'stock-photos' 
  AND auth.role() = 'authenticated'
);