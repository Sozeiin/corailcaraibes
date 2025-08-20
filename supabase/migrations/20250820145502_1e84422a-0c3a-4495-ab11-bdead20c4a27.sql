-- Créer un bucket pour les photos des articles de stock
INSERT INTO storage.buckets (id, name, public) 
VALUES ('stock-photos', 'stock-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Créer les politiques RLS pour les photos de stock
CREATE POLICY "Stock photos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'stock-photos');

CREATE POLICY "Users can upload stock photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'stock-photos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their stock photos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'stock-photos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their stock photos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'stock-photos' 
  AND auth.uid() IS NOT NULL
);