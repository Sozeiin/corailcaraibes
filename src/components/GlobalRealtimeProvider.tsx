import React from 'react';
import { 
  useRealtimeStockUpdates, 
  useRealtimeChecklistUpdates, 
  useRealtimeBoatUpdates,
  useRealtimeSupplierUpdates,
  useRealtimeOrderUpdates
} from '@/hooks/useRealtimeUpdates';

interface GlobalRealtimeProviderProps {
  children: React.ReactNode;
}

/**
 * Provider global pour les mises à jour temps réel
 * À placer une seule fois dans l'application, au niveau racine
 */
export function GlobalRealtimeProvider({ children }: GlobalRealtimeProviderProps) {
  // Activer toutes les mises à jour temps réel
  useRealtimeStockUpdates();
  useRealtimeChecklistUpdates();
  useRealtimeBoatUpdates();
  useRealtimeSupplierUpdates();
  useRealtimeOrderUpdates();

  return <>{children}</>;
}