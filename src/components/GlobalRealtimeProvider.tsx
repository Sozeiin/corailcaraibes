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
import { useNotificationSync } from '@/hooks/useNotificationSync';

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
  
  // Synchronisation des notifications push côté application
  useNotificationSync();

  // Système de heartbeat pour vérifier la connexion (moins destructif)
  useEffect(() => {
    let consecutiveFailures = 0;
    
    const heartbeatInterval = setInterval(async () => {
      try {
        // Ping Supabase pour vérifier la connexion
        const { error } = await supabase.from('boats').select('id').limit(1);
        if (error) {
          consecutiveFailures++;
          console.warn(`⚠️ Heartbeat failed (${consecutiveFailures}/3):`, error.message);
          
          // Seulement reconnecter après 3 échecs consécutifs
          if (consecutiveFailures >= 3) {
            console.warn('🔄 Multiple heartbeat failures, attempting reconnection...');
            // Force reconnect des channels uniquement, pas d'invalidation
            supabase.removeAllChannels();
            consecutiveFailures = 0;
          }
          // NE PAS invalider les queries pour éviter de vider les données
        } else {
          if (consecutiveFailures > 0) {
            console.log('💚 Heartbeat recovered after failures');
          }
          consecutiveFailures = 0;
        }
      } catch (error) {
        consecutiveFailures++;
        console.error(`❌ Heartbeat error (${consecutiveFailures}/3):`, error);
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