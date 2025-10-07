-- Table pour stocker les abonnements Web Push
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  base_id UUID REFERENCES public.bases(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  platform TEXT, -- 'web', 'android', 'ios', 'windows', 'macos'
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_base_id ON public.push_subscriptions(base_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON public.push_subscriptions(active);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions(endpoint);

-- Activer RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Politique : Les utilisateurs peuvent gérer leurs propres abonnements
CREATE POLICY "Users can manage their own subscriptions"
  ON public.push_subscriptions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Politique : Direction peut voir tous les abonnements
CREATE POLICY "Direction can view all subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'direction'::app_role));

-- Fonction pour nettoyer les abonnements inactifs (garbage collection)
CREATE OR REPLACE FUNCTION public.cleanup_inactive_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Désactiver les abonnements non utilisés depuis plus de 90 jours
  UPDATE public.push_subscriptions
  SET active = FALSE
  WHERE last_used_at < NOW() - INTERVAL '90 days'
    AND active = TRUE;
END;
$$;