-- Ajouter les colonnes de signature aux checklists de bateaux
ALTER TABLE public.boat_checklists 
ADD COLUMN signature_url TEXT,
ADD COLUMN signature_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN customer_signature_url TEXT,
ADD COLUMN customer_signature_date TIMESTAMP WITH TIME ZONE;

-- Ajouter les colonnes de signature aux locations de bateaux
ALTER TABLE public.boat_rentals
ADD COLUMN signature_url TEXT,
ADD COLUMN signature_date TIMESTAMP WITH TIME ZONE;

-- Créer le bucket pour les signatures
INSERT INTO storage.buckets (id, name, public) 
VALUES ('signatures', 'signatures', false);

-- Créer le bucket pour les rapports PDF
INSERT INTO storage.buckets (id, name, public) 
VALUES ('reports', 'reports', false);

-- Politiques pour le bucket signatures
CREATE POLICY "Users can upload their own signatures" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own signatures" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Direction can view all signatures" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'signatures' AND (
  SELECT role FROM public.profiles WHERE id = auth.uid()
) = 'direction');

-- Politiques pour le bucket reports
CREATE POLICY "Users can upload reports" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own reports" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Direction can view all reports" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'reports' AND (
  SELECT role FROM public.profiles WHERE id = auth.uid()
) = 'direction');