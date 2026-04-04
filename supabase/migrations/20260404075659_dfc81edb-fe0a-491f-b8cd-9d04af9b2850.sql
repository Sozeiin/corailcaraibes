-- Table pour stocker les brouillons de formulaires (check-in/check-out) en base
-- Remplace le localStorage pour permettre à toute l'équipe de reprendre un brouillon
CREATE TABLE public.checkin_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_key text NOT NULL,
  boat_id uuid REFERENCES boats(id) ON DELETE CASCADE,
  boat_name text,
  checklist_type text, -- 'checkin' or 'checkout'
  customer_name text,
  form_data jsonb NOT NULL DEFAULT '{}',
  signature_data jsonb DEFAULT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(form_key)
);

ALTER TABLE public.checkin_drafts ENABLE ROW LEVEL SECURITY;

-- Tous les utilisateurs authentifiés peuvent voir et modifier les brouillons
CREATE POLICY "Authenticated users can read drafts"
  ON public.checkin_drafts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert drafts"
  ON public.checkin_drafts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update drafts"
  ON public.checkin_drafts FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete drafts"
  ON public.checkin_drafts FOR DELETE
  TO authenticated
  USING (true);