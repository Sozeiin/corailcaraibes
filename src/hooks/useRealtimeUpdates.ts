import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useRealtimeStockUpdates() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
          
          // Afficher une notification pour les suppressions par d'autres utilisateurs
          if (payload.eventType === 'DELETE') {
            toast({
              title: "Article supprimé",
              description: "Un article a été supprimé par un autre utilisateur.",
              variant: "default",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);
}

export function useRealtimeChecklistUpdates() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
          
          if (payload.eventType === 'DELETE') {
            toast({
              title: "Élément de checklist supprimé",
              description: "Un élément a été supprimé par un autre utilisateur.",
              variant: "default",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);
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
          
          // Invalider les requêtes bateaux
          queryClient.invalidateQueries({ queryKey: ['boats'] });
          queryClient.invalidateQueries({ queryKey: ['boat-checklists'] });
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
        () => {
          queryClient.invalidateQueries({ queryKey: ['suppliers'] });
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
        () => {
          queryClient.invalidateQueries({ queryKey: ['orders'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}