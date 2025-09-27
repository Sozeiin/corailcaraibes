import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export const useCheckinNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    // Listen for new orders assigned to this technician
    const channel = supabase
      .channel('checkin-checkout-orders-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'checkin_checkout_orders',
          filter: `technician_id=eq.${user.id}`
        },
        (payload) => {
          const order = payload.new;
          toast.info(`Nouvel ordre ${order.order_type === 'checkin' ? 'check-in' : 'check-out'} assigné`, {
            description: `Bateau: ${order.boat?.name || 'N/A'}`,
            action: {
              label: 'Voir',
              onClick: () => {
                // Navigate to dashboard or open dialog
                window.location.reload();
              },
            },
          });
          
          // Invalidate orders query to refresh the list
          queryClient.invalidateQueries({ queryKey: ['checkin-checkout-orders'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'checkin_checkout_orders',
          filter: `technician_id=eq.${user.id}`
        },
        (payload) => {
          const order = payload.new;
          const oldOrder = payload.old;
          
          // Only notify on status changes or assignment changes
          if (order.status !== oldOrder.status || order.technician_id !== oldOrder.technician_id) {
            toast.info('Ordre mis à jour', {
              description: `Status: ${order.status}`,
            });
            
            queryClient.invalidateQueries({ queryKey: ['checkin-checkout-orders'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
};