-- Permettre la lecture publique des bases pour l'inscription
CREATE POLICY "Public can view bases for registration" ON public.bases
FOR SELECT 
TO anon
USING (true);