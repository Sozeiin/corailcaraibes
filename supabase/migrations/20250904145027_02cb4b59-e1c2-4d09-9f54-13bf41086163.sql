-- Create storage bucket for boat documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('boat-documents', 'boat-documents', false);

-- Create table for boat documents metadata
CREATE TABLE public.boat_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boat_id UUID NOT NULL REFERENCES public.boats(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  description TEXT,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on boat_documents table
ALTER TABLE public.boat_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for boat_documents
CREATE POLICY "Users can view boat documents for their base boats" 
ON public.boat_documents 
FOR SELECT 
USING (
  get_user_role() = 'direction'::user_role 
  OR EXISTS (
    SELECT 1 FROM public.boats b 
    WHERE b.id = boat_documents.boat_id 
    AND b.base_id = get_user_base_id()
  )
);

CREATE POLICY "Direction, chef_base and technicians can manage boat documents" 
ON public.boat_documents 
FOR ALL 
USING (
  get_user_role() = ANY(ARRAY['direction'::user_role, 'chef_base'::user_role, 'technicien'::user_role])
  AND (
    get_user_role() = 'direction'::user_role 
    OR EXISTS (
      SELECT 1 FROM public.boats b 
      WHERE b.id = boat_documents.boat_id 
      AND b.base_id = get_user_base_id()
    )
  )
);

-- Create storage policies for boat-documents bucket
CREATE POLICY "Users can view boat documents for their base" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'boat-documents' 
  AND (
    get_user_role() = 'direction'::user_role 
    OR EXISTS (
      SELECT 1 FROM public.boat_documents bd
      JOIN public.boats b ON b.id = bd.boat_id
      WHERE bd.storage_path = storage.objects.name 
      AND b.base_id = get_user_base_id()
    )
  )
);

CREATE POLICY "Direction, chef_base and technicians can upload boat documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'boat-documents' 
  AND get_user_role() = ANY(ARRAY['direction'::user_role, 'chef_base'::user_role, 'technicien'::user_role])
);

CREATE POLICY "Users can update their base boat documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'boat-documents' 
  AND (
    get_user_role() = 'direction'::user_role 
    OR EXISTS (
      SELECT 1 FROM public.boat_documents bd
      JOIN public.boats b ON b.id = bd.boat_id
      WHERE bd.storage_path = storage.objects.name 
      AND b.base_id = get_user_base_id()
    )
  )
);

CREATE POLICY "Users can delete their base boat documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'boat-documents' 
  AND (
    get_user_role() = 'direction'::user_role 
    OR EXISTS (
      SELECT 1 FROM public.boat_documents bd
      JOIN public.boats b ON b.id = bd.boat_id
      WHERE bd.storage_path = storage.objects.name 
      AND b.base_id = get_user_base_id()
    )
  )
);

-- Create trigger for updating updated_at
CREATE TRIGGER update_boat_documents_updated_at
  BEFORE UPDATE ON public.boat_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();