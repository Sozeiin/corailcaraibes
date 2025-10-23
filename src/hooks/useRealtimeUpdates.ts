import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

export function useRealtimeStockUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('stock-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_items'
        },
        (payload) => {
          console.log('📡 Mise à jour temps réel stock:', payload);
          
          // Invalider les requêtes stock pour récupérer les dernières données
          queryClient.invalidateQueries({ queryKey: ['stock-items'] });
          queryClient.invalidateQueries({ queryKey: ['stock_items'] });
          queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
          queryClient.invalidateQueries({ queryKey: ['component-stock-links'] });
          queryClient.invalidateQueries({ queryKey: ['component-purchase-history'] });
          
          // Afficher une notification pour les suppressions par d'autres utilisateurs
          if (payload.eventType === 'DELETE') {
            toast.error("Article supprimé par un autre utilisateur");
          } else if (payload.eventType === 'INSERT') {
            toast.success("Nouvel article ajouté au stock");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export function useRealtimeChecklistUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('checklist-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checklist_items'
        },
        (payload) => {
          console.log('📡 Mise à jour temps réel checklist:', payload);
          
          // Invalider les requêtes checklist
          queryClient.invalidateQueries({ queryKey: ['checklist-items'] });
          queryClient.invalidateQueries({ queryKey: ['boat-checklists'] });
          queryClient.invalidateQueries({ queryKey: ['boat-checklist-history'] });
          
          if (payload.eventType === 'DELETE') {
            toast.error("Élément de checklist supprimé par un autre utilisateur");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export function useRealtimeBoatUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('boat-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'boats'
        },
        (payload) => {
          console.log('📡 Mise à jour temps réel bateaux:', payload);
          
          // Invalider les requêtes bateaux et données liées
          queryClient.invalidateQueries({ queryKey: ['boats'] });
          queryClient.invalidateQueries({ queryKey: ['boat-checklists'] });
          queryClient.invalidateQueries({ queryKey: ['boat-components'] });
          queryClient.invalidateQueries({ queryKey: ['boat-dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['boat-interventions'] });
          queryClient.invalidateQueries({ queryKey: ['boat-rentals'] });
          queryClient.invalidateQueries({ queryKey: ['boat-preparation-history'] });
          queryClient.invalidateQueries({ queryKey: ['boat-safety-controls'] });
          queryClient.invalidateQueries({ queryKey: ['administrative-checkin-forms'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export function useRealtimeSupplierUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('supplier-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'suppliers'
        },
        (payload) => {
          console.log('📡 Mise à jour temps réel fournisseurs:', payload);
          queryClient.invalidateQueries({ queryKey: ['suppliers'] });
          queryClient.invalidateQueries({ queryKey: ['stock-item-quotes'] });
          queryClient.invalidateQueries({ queryKey: ['component-supplier-references'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export function useRealtimeOrderUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('order-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('📡 Mise à jour temps réel commandes:', payload);
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['order-items'] });
          queryClient.invalidateQueries({ queryKey: ['purchase-workflow-steps'] });
          queryClient.invalidateQueries({ queryKey: ['order-tracking'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export function useRealtimeAdministrativeCheckinUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('administrative-checkin-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'administrative_checkin_forms'
        },
        (payload) => {
          console.log('📡 Mise à jour temps réel fiches administratives:', payload);
          queryClient.invalidateQueries({ queryKey: ['administrative-checkin-forms'] });
          queryClient.invalidateQueries({ queryKey: ['ready-checkin-forms'] });
          queryClient.invalidateQueries({ queryKey: ['client-forms-pool'] });
          queryClient.invalidateQueries({ queryKey: ['boats-checkin-checkout'] });
          
          if (payload.eventType === 'INSERT') {
            toast.success("Nouvelle fiche client créée");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export function useRealtimeInterventionUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('intervention-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interventions'
        },
        (payload) => {
          console.log('📡 Mise à jour temps réel interventions:', payload);
          queryClient.invalidateQueries({ queryKey: ['interventions'] });
          queryClient.invalidateQueries({ queryKey: ['maintenance-history'] });
          queryClient.invalidateQueries({ queryKey: ['boat-interventions'] });
          queryClient.invalidateQueries({ queryKey: ['boat-intervention-history'] });
          queryClient.invalidateQueries({ queryKey: ['scheduled-interventions'] });
          queryClient.invalidateQueries({ queryKey: ['boat-upcoming-interventions'] });
          
          if (payload.eventType === 'INSERT') {
            toast.success("Nouvelle intervention créée");
          } else if (payload.eventType === 'UPDATE' && payload.new?.status === 'completed') {
            toast.success("Intervention terminée");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export function useRealtimePlanningUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('planning-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'planning_activities'
        },
        (payload) => {
          console.log('📡 Mise à jour temps réel planning:', payload);
          queryClient.invalidateQueries({ queryKey: ['planning-activities'] });
          queryClient.invalidateQueries({ queryKey: ['boat-preparation-history'] });
          queryClient.invalidateQueries({ queryKey: ['scheduled-maintenance'] });
          queryClient.invalidateQueries({ queryKey: ['preparation-orders'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export function useRealtimeBoatComponentUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('boat-component-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'boat_components'
        },
        (payload) => {
          console.log('📡 Mise à jour temps réel composants:', payload);
          queryClient.invalidateQueries({ queryKey: ['boat-components'] });
          queryClient.invalidateQueries({ queryKey: ['boat-components-maintenance'] });
          queryClient.invalidateQueries({ queryKey: ['component-stock-links'] });
          queryClient.invalidateQueries({ queryKey: ['component-purchase-history'] });
          queryClient.invalidateQueries({ queryKey: ['sub-components'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export function useRealtimeBoatChecklistUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('boat-checklist-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'boat_checklists'
        },
        (payload) => {
          console.log('📡 Mise à jour temps réel checklists bateau:', payload);
          queryClient.invalidateQueries({ queryKey: ['boat-checklists'] });
          queryClient.invalidateQueries({ queryKey: ['boat-checklist-history'] });
          queryClient.invalidateQueries({ queryKey: ['checklist-details'] });
          
          if (payload.eventType === 'INSERT') {
            toast.success("Nouvelle checklist créée");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export function useRealtimeBoatRentalUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('boat-rental-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'boat_rentals'
        },
        (payload) => {
          console.log('📡 Mise à jour temps réel locations:', payload);
          queryClient.invalidateQueries({ queryKey: ['boat-rentals'] });
          queryClient.invalidateQueries({ queryKey: ['active-rentals'] });
          queryClient.invalidateQueries({ queryKey: ['boats-available'] });
          
          if (payload.eventType === 'INSERT') {
            toast.success("Nouvelle location créée");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

// Hook pour les notifications
export function useRealtimeNotificationUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('notification-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          console.log('📡 Mise à jour temps réel notifications:', payload);
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

// Hook pour les préparations de bateaux
export function useRealtimeBoatPreparationUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('boat-preparation-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'boat_preparation_checklists'
        },
        (payload) => {
          console.log('📡 Mise à jour temps réel préparations:', payload);
          queryClient.invalidateQueries({ queryKey: ['boat-preparation-history'] });
          queryClient.invalidateQueries({ queryKey: ['boat-preparation-checklists'] });
          queryClient.invalidateQueries({ queryKey: ['preparation-orders'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

// Hook pour les mouvements de stock
export function useRealtimeStockMovementUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('stock-movement-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_movements'
        },
        (payload) => {
          console.log('📡 Mise à jour temps réel mouvements stock:', payload);
          queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
          queryClient.invalidateQueries({ queryKey: ['stock-items'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}