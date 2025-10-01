import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  useRealtimeStockUpdates, 
  useRealtimeChecklistUpdates, 
  useRealtimeBoatUpdates,
  useRealtimeSupplierUpdates,
  useRealtimeOrderUpdates,
  useRealtimeAdministrativeCheckinUpdates,
  useRealtimeInterventionUpdates,
  useRealtimePlanningUpdates,
  useRealtimeBoatComponentUpdates,
  useRealtimeBoatChecklistUpdates,
  useRealtimeBoatRentalUpdates,
  useRealtimeNotificationUpdates,
  useRealtimeBoatPreparationUpdates,
  useRealtimeStockMovementUpdates
} from '@/hooks/useRealtimeUpdates';

interface GlobalRealtimeProviderProps {
  children: React.ReactNode;
}

/**
 * Provider global pour les mises à jour temps réel
 * À placer une seule fois dans l'application, au niveau racine
 * Inclut un système de heartbeat pour la connexion
 */
export function GlobalRealtimeProvider({ children }: GlobalRealtimeProviderProps) {
  const queryClient = useQueryClient();

  // Activer toutes les mises à jour temps réel
  useRealtimeStockUpdates();
  useRealtimeChecklistUpdates();
  useRealtimeBoatUpdates();
  useRealtimeSupplierUpdates();
  useRealtimeOrderUpdates();
  useRealtimeAdministrativeCheckinUpdates();
  useRealtimeInterventionUpdates();
  useRealtimePlanningUpdates();
  useRealtimeBoatComponentUpdates();
  useRealtimeBoatChecklistUpdates();
  useRealtimeBoatRentalUpdates();
  useRealtimeNotificationUpdates();
  useRealtimeBoatPreparationUpdates();
  useRealtimeStockMovementUpdates();

  // Système de heartbeat pour vérifier la connexion
  useEffect(() => {
    const heartbeatInterval = setInterval(async () => {
      try {
        // Ping Supabase pour vérifier la connexion
        const { error } = await supabase.from('boats').select('id').limit(1);
        if (error) {
          console.warn('⚠️ Heartbeat failed, reconnecting...', error);
          // Force reconnect des channels
          supabase.removeAllChannels();
          queryClient.invalidateQueries();
        } else {
          console.log('💚 Heartbeat OK - Connection active');
        }
      } catch (error) {
        console.error('❌ Heartbeat error:', error);
      }
    }, 60000); // Vérifier toutes les minutes

    return () => clearInterval(heartbeatInterval);
  }, [queryClient]);

  // Détection de reconnexion réseau
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Connexion rétablie, refresh complet...');
      queryClient.invalidateQueries();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [queryClient]);

  return <>{children}</>;
}