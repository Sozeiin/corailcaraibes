-- Permettre à tous les utilisateurs authentifiés de voir les profils basiques des autres utilisateurs
-- Nécessaire pour afficher les auteurs des messages dans la messagerie
CREATE POLICY "Users can view basic profile info for messaging"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);